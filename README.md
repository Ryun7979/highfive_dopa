# highfive_dopa（はちゃめちゃタイプ）

視力の弱い子も遊べる、ド派手演出の子ども向けローマ字タイピングゲーム。
[highfive_7979](../highfive_7979)（TYPING MINI v0.4.3）をベースにしています。

- 仕様書: [docs/spec.md](docs/spec.md)
- AI 向けの作業ガイド: [CLAUDE.md](CLAUDE.md)、作業記憶: [LEARNINGS.md](LEARNINGS.md)
- 素材台帳: [docs/assets.md](docs/assets.md)
- 相棒キャラ「ラビッドパ」: [docs/character/](docs/character/)（`preview.html` をブラウザで開くとアニメーションを確認できます）

## 動かし方

前提: Node.js 20 以上

```bash
npm install
npm run dev        # http://localhost:3000
```

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 型チェック＋本番ビルド（`dist/`） |
| `npm run preview` | ビルド結果の確認 |
| `npm run typecheck` | 型チェックのみ |

## オフライン動作

Tailwind CSS・フォント・ライブラリはすべてビルドに同梱しており、CDN や外部 API には接続しません。
`npm install` 後はネットワークなしで開発・ビルド・プレイできます。
