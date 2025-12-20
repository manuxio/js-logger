export function humanDate() {
    const d = new Date();
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}
export function kvString(data) {
    const parts = [];
    for (const [k, v] of Object.entries(data))
        parts.push(`${k}=${v}`);
    return parts.join(' ');
}
