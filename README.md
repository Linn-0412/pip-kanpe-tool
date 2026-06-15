# PiP カンペツール

GitHub Pagesで公開する、画像カンペ用の静的Webアプリです。

## 公開URL

- アプリ: https://linn-0412.github.io/pip-kanpe-tool/
- リポジトリ: https://github.com/Linn-0412/pip-kanpe-tool

## 機能

- 画像を最大40枚まで登録
- Document Picture-in-Pictureで常時前面の小窓表示
- PiP内の左右ボタンで前後切り替え
- 画像は各ユーザーのブラウザ内IndexedDBに保存
- サーバー側には画像を保存しません
- 初回アクセス時に使い方ガイドを表示し、次回以降の非表示設定を保存できます
- Chrome拡張機能を併用すると、グローバルショートカットで前後の画像に切り替えできます

## 使い方

1. ChromeまたはEdgeでページを開く
2. カンペ画像を登録する。複数ファイルの同時選択に対応しており、ファイル名順で追加されます。
3. `PiPで表示` を押す
4. PiP小窓の `←` / `→` で切り替える

使い方ガイドはヘッダーの `使い方` ボタンから再表示できます。URL末尾に `?guide=1` を付けても強制表示できます。

FF14などのゲーム上に重ねる場合は、排他フルスクリーンではなくボーダーレスウィンドウ表示が向いています。

## Chrome拡張機能

Releaseに添付している拡張機能ZIPを使うと、ゲームをアクティブにしたままショートカットでカンペを切り替えられます。

1. [こちらから拡張機能ZIPをダウンロードする](https://github.com/Linn-0412/pip-kanpe-tool/releases/latest/download/pip-kanpe-tool-hotkeys-extension.zip)
2. ZIPを任意の場所に解凍する
3. Chromeの拡張機能画面（`chrome://extensions/`）を開く
4. 右上の `デベロッパーモード` をオンにする
5. `パッケージ化されていない拡張機能を読み込む` から、解凍したフォルダを選ぶ
6. ショートカット設定画面（`chrome://extensions/shortcuts`）を開く
7. `PiP カンペツール Hotkeys` のショートカットを確認する

初期設定では `Ctrl+Shift+9` が次、`Ctrl+Shift+8` が前です。FF14のキーバインドと衝突する場合は、ショートカット設定画面で別のキーに変更してください。Chromeの仕様上、環境によってはショートカット画面で手動設定が必要です。

拡張機能を更新したあとは、`chrome://extensions/` の更新ボタンを押すか、拡張機能を読み込み直してください。PiPカンペツールのページも再読み込みすると確実です。

開発者向けには、このリポジトリ内の `extension/` フォルダを直接読み込むこともできます。

## 注意

Document Picture-in-Picture APIは対応ブラウザが限られます。非対応ブラウザでは通常プレビューのみ利用できます。

## ライセンス

MIT License
