# プロジェクトセットアップ

## 前提条件

- Node.js v24以上
- npm

## セットアップ手順

1. 依存関係のインストール
   ```bash
   npm install
   ```

2. TypeScriptのビルド
   ```bash
   npm run build
   ```

3. アプリケーションの実行
   ```bash
   npm start
   ```

## 開発用コマンド

- `npm run build` - TypeScriptをコンパイル
- `npm run format` - Prettierでコードフォーマット (改行幅150文字)
- `npm run test` - vitestでテスト実行とカバレッジ取得
- `npm start` - アプリケーション開始

## プロジェクト構成

- `src/main.mts` - メインエントリーポイント
- `src/main.test.mts` - メイン関数のテスト
- `tsconfig.json` - TypeScript設定 (最もstrictな設定)
- `vitest.config.mts` - vitestテスト設定
- `package.json` - プロジェクト設定とESMモジュール設定