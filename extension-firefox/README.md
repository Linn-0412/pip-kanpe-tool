# PiP カンペツール Hotkeys for Firefox

PiPカンペツールをFirefoxのショートカットで操作する補助拡張です。
Chrome / Edge向け拡張機能とはmanifestとbackgroundの仕組みが違うため、Firefox用として別フォルダにしています。

## インストール

Firefoxで未署名の拡張機能を使う場合、基本は一時的なアドオンとして読み込みます。
一時的なアドオンはFirefoxを再起動すると外れる場合があります。

1. Firefoxで `about:debugging#/runtime/this-firefox` を開く
2. `一時的なアドオンを読み込む` を押す
3. この `extension-firefox/manifest.json` を選ぶ
4. `about:addons` を開く
5. 歯車メニューの `拡張機能のショートカットを管理` からショートカットを確認する

## 初期ショートカット

- 前のカンペへ: `Ctrl+Shift+8`
- 次のカンペへ: `Ctrl+Shift+9`

Firefoxの仕様上、ショートカットは環境によって手動設定が必要です。
反応しない場合は `about:addons` の歯車メニューから `拡張機能のショートカットを管理` を開き、任意のキーへ割り当て直してください。
