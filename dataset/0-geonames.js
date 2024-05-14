import fs from 'fs';

const username = ''; // REDACTED USERNAME FOR PUBLIC RELEASE
throw 'A username needs to be added';
const pairs = [
    {
        country: 'DE',
        contryLang: 'de',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'US',
        contryLang: 'en',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'UK',
        contryLang: 'en',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'ES',
        contryLang: 'es',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'MX',
        contryLang: 'es',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'FR',
        contryLang: 'fr',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'IT',
        contryLang: 'it',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'JP',
        contryLang: 'ja',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'KP',
        contryLang: 'ko',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'KR',
        contryLang: 'ko',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'LV',
        contryLang: 'lv',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'PL',
        contryLang: 'pl',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'PT',
        contryLang: 'pt',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'BR',
        contryLang: 'pt',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'RO',
        contryLang: 'ro',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'RU',
        contryLang: 'ru',
        languages: ['ko', 'ja', 'zh']
    },
    {
        country: 'CN',
        contryLang: 'zh',
        languages: ['ko', 'ja', 'zh']
    },
    
]

async function getLanguage(country, language, countryLang) {
    let results = [];
    for (let i = 0; i <= 5000; i+= 1000) {
        let url = `http://api.geonames.org/searchJSON?username=${username}&country=${country}&lang=${language}&maxRows=1000`;
        if (i) url += `&startRow=${i}`;

        const res = await (await fetch(url)).json();

        for (const geoname of res.geonames) {
            const {name, toponymName} = geoname;

            if (name === toponymName) continue;

            results.push([toponymName,name].join(','))
        }
    }
    fs.writeFileSync(`./1-input-files/${language}_${countryLang}_5_place-geonames_${country}.csv`, results.join("\n"));
}

for (const pair of pairs) {
    for (const language of pair.languages) {
        await getLanguage(pair.country, language, pair.contryLang);
    }
}