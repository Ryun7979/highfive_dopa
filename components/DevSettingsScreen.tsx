
import React, { useState, useEffect, useRef } from 'react';
import { getAllDefinitions, getRomajiPreferences, saveRomajiPreferences } from '../utils/romajiUtils';
import { getSettings, saveSettings, FontType } from '../utils/settingsManager';
import { exportWordsAsJson, importWordsFromJson, resetCustomWords, clearWordCache } from '../utils/wordListManager';
import { Save, RotateCcw, ArrowLeft, Settings, Check, UserCheck, Type, Download, Upload, FileJson, AlertCircle, Loader2 } from 'lucide-react';
import { audioManager } from '../utils/audioManager';

interface DevSettingsScreenProps {
  onBack: () => void;
  onSettingsSaved?: () => void;
}

const DevSettingsScreen: React.FC<DevSettingsScreenProps> = ({ onBack, onSettingsSaved }) => {
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [fontType, setFontType] = useState<FontType>('POP');
  const [isDirty, setIsDirty] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const definitions = getAllDefinitions();

  useEffect(() => {
    setPreferences(getRomajiPreferences());
    setFontType(getSettings().fontType);
  }, []);

  const handleSelect = (kana: string, romaji: string) => {
    setPreferences(prev => {
      const updated = { ...prev };
      updated[kana] = romaji;
      return updated;
    });
    setIsDirty(true);
    audioManager.playSelect();
  };

  const handleFontChange = (type: FontType) => {
    setFontType(type);
    setIsDirty(true);
    audioManager.playSelect();
  };

  const handleSave = () => {
    saveRomajiPreferences(preferences);
    saveSettings({ fontType });
    clearWordCache();
    setIsDirty(false);
    audioManager.playFanfare();
    setImportStatus({ type: 'success', message: '設定を保存しました！' });
    setTimeout(() => setImportStatus({ type: null, message: '' }), 3000);
    if (onSettingsSaved) onSettingsSaved();
  };

  const handleResetAll = () => {
    if (confirm('すべての設定（ローマ字設定・フォント・追加した単語）を初期化しますか？')) {
      saveRomajiPreferences({});
      saveSettings({ fontType: 'POP' });
      resetCustomWords();
      setPreferences({});
      setFontType('POP');
      setIsDirty(false);
      audioManager.playCancel();
      setImportStatus({ type: 'success', message: '初期状態に戻しました。' });
      setTimeout(() => setImportStatus({ type: null, message: '' }), 3000);
      if (onSettingsSaved) onSettingsSaved();
    }
  };

  const handleClearPreference = (kana: string) => {
    const next = { ...preferences };
    delete next[kana];
    setPreferences(next);
    setIsDirty(true);
    audioManager.playCancel();
  };

  const handleExport = () => {
    const data = exportWordsAsJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typing_mini_words_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    audioManager.playSelect();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = importWordsFromJson(content);
      setIsProcessing(false);
      if (result.success) {
        setImportStatus({ type: 'success', message: result.message });
        audioManager.playFanfare();
      } else {
        setImportStatus({ type: 'error', message: result.message });
        audioManager.playMiss();
      }
      setTimeout(() => setImportStatus({ type: null, message: '' }), 5000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getActiveRomaji = (kana: string, candidates: string[]) => {
    // ユーザーが明示的に保存している設定があればそれを返す
    if (preferences[kana] && candidates.includes(preferences[kana])) {
      return preferences[kana];
    }
    
    // なければ、システムのデフォルト定義リスト（SINGLE_KANA/COMPOUNDS）の先頭を返す
    // すでにromajiUtils側でsi, zi等が先頭になっているため、candidates[0]で正しい
    return candidates[0];
  };

  const renderSection = (title: string, data: Record<string, string[]>) => {
    return (
      <div className="mb-12">
        <h3 className="text-xl font-bold text-white bg-slate-800 px-6 py-3 rounded-xl mb-6 inline-flex items-center gap-2 shadow-lg border-l-4 border-brand-blue sticky top-0 z-10">
          {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.entries(data).map(([kana, candidates]) => {
            const activeRomaji = getActiveRomaji(kana, candidates);
            const savedRomaji = preferences[kana];

            return (
              <div key={kana} className={`
                relative rounded-xl p-4 shadow-sm border-2 transition-colors
                ${savedRomaji 
                   ? 'bg-blue-50/90 border-brand-blue/50' 
                   : 'bg-white/90 border-slate-200'}
              `}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl font-black text-slate-800">{kana}</span>
                  {savedRomaji && (
                    <button 
                      onClick={() => handleClearPreference(kana)}
                      className="text-xs font-bold text-slate-400 hover:text-red-500 bg-white border border-slate-200 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      解除
                    </button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {candidates.map(romaji => {
                    const isActive = romaji === activeRomaji;
                    const isSaved = romaji === savedRomaji;
                    return (
                      <button
                        key={romaji}
                        onClick={() => handleSelect(kana, romaji)}
                        className={`
                          relative px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all flex items-center gap-1
                          ${isActive 
                            ? 'bg-brand-blue text-white border-brand-blue shadow-md scale-105 z-10' 
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}
                        `}
                      >
                        {romaji}
                        {isSaved && <UserCheck size={14} className="text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-slate-900 flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <div className="flex-none bg-slate-900 border-b border-slate-700 p-4 shadow-xl z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-brand-yellow p-2 rounded-lg">
               <Settings className="text-slate-900 w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-wider">設定</h1>
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto justify-end">
            <button onClick={handleResetAll} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-slate-400 hover:text-white transition-colors text-sm">
              <RotateCcw size={16} /> 初期化
            </button>
            <button onClick={onBack} className="flex items-center gap-2 px-5 py-2 bg-slate-700 text-white rounded-full font-bold hover:bg-slate-600 transition-all text-sm">
              <ArrowLeft size={18} /> 戻る
            </button>
            <button 
              onClick={handleSave}
              disabled={!isDirty || isProcessing}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-black shadow-lg transition-all text-sm ${isDirty ? 'bg-brand-green text-white hover:brightness-110' : 'bg-slate-800 text-slate-600'}`}
            >
              <Save size={18} /> 保存する
            </button>
          </div>
        </div>
      </div>

      {/* Floating Notification */}
      {importStatus.type && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] w-full max-w-md px-4">
          <div className={`p-4 rounded-2xl flex items-center gap-3 border-4 shadow-2xl animate-bounce-short ${
            importStatus.type === 'success' ? 'bg-brand-green border-white text-white' : 'bg-brand-red border-white text-white'
          }`}>
            {importStatus.type === 'success' ? <Check size={24} strokeWidth={3}/> : <AlertCircle size={24} strokeWidth={3}/>}
            <span className="font-black text-lg">{importStatus.message}</span>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex flex-col items-center justify-center">
          <Loader2 size={64} className="text-brand-yellow animate-spin mb-4" />
          <p className="text-white font-black text-2xl">しょり中...</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-slate-900/50 p-4 md:p-8">
         <div className="max-w-7xl mx-auto pb-20">
           {/* Export/Import */}
           <div className="mb-12">
             <h3 className="text-xl font-bold text-white bg-slate-800 px-6 py-3 rounded-xl mb-6 inline-flex items-center gap-2 shadow-lg border-l-4 border-brand-yellow sticky top-0 z-10">
               <FileJson size={20} /> 問題リストの管理
             </h3>
             <div className="bg-white/95 rounded-2xl p-6 shadow-xl border-4 border-slate-200">
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div className="flex-1 text-slate-700">
                    <p className="font-black text-lg mb-1">現在の問題を保存・読み込みできます</p>
                    <p className="text-sm opacity-70">インポートすると現在追加されている問題は上書きされます。</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={handleExport} className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-black hover:bg-slate-700 shadow-lg transition-all active:scale-95">
                      <Download size={20} /> 保存
                    </button>
                    <button onClick={handleImportClick} className="flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-xl font-black hover:brightness-110 shadow-lg transition-all active:scale-95">
                      <Upload size={20} /> 読込
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                  </div>
                </div>
             </div>
           </div>

           {/* Font Settings */}
           <div className="mb-12">
             <h3 className="text-xl font-bold text-white bg-slate-800 px-6 py-3 rounded-xl mb-6 inline-flex items-center gap-2 shadow-lg border-l-4 border-brand-green sticky top-0 z-10">
               <Type size={20} /> フォント
             </h3>
             <div className="bg-white/95 rounded-2xl p-6 shadow-xl border-4 border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button onClick={() => handleFontChange('POP')} className={`p-6 rounded-xl border-4 transition-all ${fontType === 'POP' ? 'bg-brand-blue/10 border-brand-blue' : 'bg-slate-100 border-slate-200'}`}>
                    <div className="text-4xl font-pop text-slate-800 mb-2">あいうえお</div>
                    <div className="font-bold">ポップ体</div>
                  </button>
                  <button onClick={() => handleFontChange('ROUNDED')} className={`p-6 rounded-xl border-4 transition-all ${fontType === 'ROUNDED' ? 'bg-brand-blue/10 border-brand-blue' : 'bg-slate-100 border-slate-200'}`}>
                    <div className="text-4xl font-rounded text-slate-800 mb-2">あいうえお</div>
                    <div className="font-bold">丸ゴシック</div>
                  </button>
                </div>
             </div>
           </div>

           {renderSection('基本', definitions.SINGLE_KANA)}
           {renderSection('拗音', definitions.COMPOUNDS)}
           <div className="h-20"></div>
        </div>
      </div>
    </div>
  );
};

export default DevSettingsScreen;
