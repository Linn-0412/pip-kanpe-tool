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

## 使い方

1. ChromeまたはEdgeでページを開く
2. カンペ画像を登録する。複数ファイルの同時選択にも対応しています。
3. `PiPで表示` を押す
4. PiP小窓の `←` / `→` で切り替える

FF14などのゲーム上に重ねる場合は、排他フルスクリーンではなくボーダーレスウィンドウ表示が向いています。

## 注意

Document Picture-in-Picture APIは対応ブラウザが限られます。非対応ブラウザでは通常プレビューのみ利用できます。

## ライセンス

MIT License
