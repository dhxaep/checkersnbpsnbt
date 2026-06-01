
function hashString(e) {
    let t = 0;
    const a = e.length;
    let n = 0;
    if (a > 0) {
        for (; n < a;) t = (t << 5) - t + e.charCodeAt(n++) | 0;
    }
    return t;
}

function getPath(e) {
    const t = hashString(e);
    return (255 & t).toString().padStart(3, '0') + '/' + ((t >> 8) & 255).toString().padStart(3, '0');
}

const noPeserta = '426630866';
const url = 'https://snbp.ipb.ac.id/data/' + getPath(noPeserta) + '/' + noPeserta + '.json';
console.log('Fetching', url);
fetch(url).then(r => r.text()).then(console.log).catch(console.error);

