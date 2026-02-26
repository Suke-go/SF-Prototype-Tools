/**
 * 全角英数字を半角に変換する。
 * 日本語キーボードで全角入力されたセッションコード等を正規化するために使用。
 */
export function toHalfWidth(str: string): string {
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
        String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    ).replace(/[ー−]/g, '-').replace(/＿/g, '_')
}
