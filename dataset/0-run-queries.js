import fs from 'fs'
import { WBK } from 'wikibase-sdk'


const wbk = WBK({
    instance: 'https://www.wikidata.org',
    sparqlEndpoint: 'https://query.wikidata.org/sparql'
})

const LANG_TO_COUNTRY = {
    'de': {
        'Germany': 'Q183'
    },
    'en': {
        'US': 'Q30',
        'UK': 'Q145'
    },
    'es': {
        'Spain': 'Q29',
        'Mexico': 'Q96'
    },
    'fr': {
        'France': 'Q142',
        'Quebec': 'Q176'
    },
    'it': {
        'Italy': 'Q38'
    },
    'ja': {
        'Japan': 'Q17'
    },
    'ko': {
        'SouthKorea': 'Q884',
        'NorthKorea': 'Q423'
    },
    'lv': {
        'Latvia': 'Q211'
    },
    'pl': {
        'Poland': 'Q36'
    },
    'pt': {
        'Portugal': 'Q45',
        'Brazil': 'Q155'
    },
    'ro': {
        'Romania': 'Q218'
    },
    'ru': {
        'Russia': 'Q159'
    },
    'zh': {
        'China': 'Q148'
    }
}

const LANG_TO_SOURCES = {
    'ko': [
        'de',
        'en',
        'es',
        'fr',
        'it',
        'ja',
        'ko',
        'lv',
        'pl',
        'pt',
        'ro',
        'ru',
        'zh'
    ],
    'ja': [
        'de',
        'en',
        'es',
        'fr',
        'it',
        'ja',
        'ko',
        'lv',
        'pl',
        'pt',
        'ro',
        'ru',
        'zh'
    ],
    'zh': [
        'de',
        'en',
        'es',
        'fr',
        'it',
        'ja',
        'ko',
        'lv',
        'pl',
        'pt',
        'ro',
        'ru',
        'zh'
    ]
}
const SPLITTERS = {
    'default': ' ',
    'zh': '·',
    'ja': '・'
}
const QUERY_STEPS = [10000, 7500, 5000, 2500, 2000, 1500, 1000, 500, 400, 300, 200, 100];
const DIR_OUTPUT = './1-input-files';

function saveBindings(filename, results) {
    const lines = [];
    for (const result of results) {
        const contents = [result.inp.value.includes(',') ? `"${result.inp.value}"` : result.inp.value];
        if (result.out) {
            contents.push(result.out.value.includes(',') ? `"${result.out.value}"` : result.out.value);
        }
        lines.push(contents.join(','));
    }
    fs.writeFileSync(filename, lines.join("\n"));
}

async function runPlaceWikipediaQueries(langs, countryName, countryCode) {
    for (const queryStep of QUERY_STEPS) {
        try {
            const query = `
SELECT ?inp ${langs[1] ? '?out' : ''}
WHERE {
  {?item wdt:P17 wd:${countryCode}.}

  ?inp schema:about ?item; schema:isPartOf <https://${langs[0]}.wikipedia.org/>.
  
  ${langs[1] ? `?out schema:about ?item; schema:isPartOf <https://${langs[1]}.wikipedia.org/>.` : ''}

  SERVICE wikibase:label { bd:serviceParam wikibase:language "${langs.join(',')}". }
}
LIMIT ${queryStep}
`;
            const url = wbk.sparqlQuery(query)
            const headers = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }; // see https://meta.wikimedia.org/wiki/User-Agent_policy

            let res = await fetch(url, { method: 'GET', headers })
            res = await res.json();
            res = res.results.bindings;
            for (let i = 0; i < res.length; i++) {
                res[i].inp.value = res[i].inp.value.replace(`https://${langs[0]}.wikipedia.org/wiki/`, '');
                res[i].inp.value = decodeURI(res[i].inp.value);
                res[i].inp.value = res[i].inp.value.replaceAll('_', SPLITTERS[langs[0]] ?? SPLITTERS.default);
                if (res[i].out) {
                    res[i].out.value = res[i].out.value.replace(`https://${langs[1]}.wikipedia.org/wiki/`, '');
                    res[i].out.value = decodeURI(res[i].out.value);
                    res[i].out.value = res[i].out.value.replaceAll('_', SPLITTERS[langs[1]] ?? SPLITTERS.default);
                }
            }
            saveBindings(`${DIR_OUTPUT}/${langs[1] ?? langs[0]}_${langs[0]}_2_place-wikipedia_${countryName}.csv`, res);
            console.log('OK - ', 'runPlaceWikipediaQueries', langs, countryName, countryCode, queryStep)
            break;
        } catch (e) {
            console.log('FAIL - ', 'runPlaceWikipediaQueries', langs, countryName, countryCode, queryStep)
        }
    }
    return;
}

async function runPersonWikipediaQueries(langs, countryName, countryCode) {
    for (const queryStep of QUERY_STEPS) {
        try {
            const query = `
SELECT ?inp ${langs[1] ? '?out' : ''}
WHERE {
  {?item wdt:P27 wd:${countryCode}.}

  ?inp schema:about ?item; schema:isPartOf <https://${langs[0]}.wikipedia.org/>.
  
  ${langs[1] ? `?out schema:about ?item; schema:isPartOf <https://${langs[1]}.wikipedia.org/>.` : ''}

  SERVICE wikibase:label { bd:serviceParam wikibase:language "${langs.join(',')}". }
}
LIMIT ${queryStep}
`;
            const url = wbk.sparqlQuery(query)
            const headers = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }; // see https://meta.wikimedia.org/wiki/User-Agent_policy

            let res = await fetch(url, { method: 'GET', headers })
            res = await res.json();
            res = res.results.bindings;
            for (let i = 0; i < res.length; i++) {
                res[i].inp.value = res[i].inp.value.replace(`https://${langs[0]}.wikipedia.org/wiki/`, '');
                res[i].inp.value = decodeURI(res[i].inp.value);
                res[i].inp.value = res[i].inp.value.replaceAll('_', SPLITTERS[langs[0]] ?? SPLITTERS.default);
                if (res[i].out) {
                    res[i].out.value = res[i].out.value.replace(`https://${langs[1]}.wikipedia.org/wiki/`, '');
                    res[i].out.value = decodeURI(res[i].out.value);
                    res[i].out.value = res[i].out.value.replaceAll('_', SPLITTERS[langs[1]] ?? SPLITTERS.default);
                }
            }
            saveBindings(`${DIR_OUTPUT}/${langs[1] ?? langs[0]}_${langs[0]}_1_person-wikipedia_${countryName}.csv`, res);
            console.log('OK - ', 'runPersonWikipediaQueries', langs, countryName, countryCode, queryStep)
            break;
        } catch (e) {
            console.log('FAIL - ', 'runPersonWikipediaQueries', langs, countryName, countryCode, queryStep)
        }
    }
    return;
}

async function runPersonQueries(langs, countryName, countryCode) {
    for (const queryStep of QUERY_STEPS) {
        try {
            const query = `
SELECT ?inp ${langs[1] ? '?out' : ''}
WHERE {
?person wdt:P27 wd:${countryCode}.
SERVICE wikibase:label { bd:serviceParam wikibase:language "${langs.join(',')}". }
?person rdfs:label ?inp filter (lang(?inp) = "${langs[0]}").
${langs[1] ? `?person rdfs:label ?out filter (lang(?out) = "${langs[1]}").` : ''}
}
LIMIT ${queryStep}
`;

            const url = wbk.sparqlQuery(query)
            const headers = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }; // see https://meta.wikimedia.org/wiki/User-Agent_policy

            let res = await fetch(url, { method: 'GET', headers })
            res = await res.json();
            res = res.results.bindings;
            saveBindings(`${DIR_OUTPUT}/${langs[1] ?? langs[0]}_${langs[0]}_3_person_${countryName}.csv`, res);
            console.log('OK - ', 'runPersonQueries', langs, countryName, countryCode, queryStep)
            break;
        } catch (e) {
            console.log('FAIL - ', 'runPersonQueries', langs, countryName, countryCode, queryStep)
        }
    }
    return;
}

async function runPlaceQueries(langs, countryName, countryCode) {
    for (const queryStep of QUERY_STEPS) {
        try {
            const query =
                `
SELECT ?inp ${langs[1] ? '?out' : ''}
WHERE {
    ?place       wdt:P17 wd:${countryCode}.
    SERVICE wikibase:label { bd:serviceParam wikibase:language "${langs.join(',')}". }
    ?place rdfs:label ?inp filter (lang(?inp) = "${langs[0]}").
    ${langs[1] ? `?place rdfs:label ?out filter (lang(?out) = "${langs[1]}").` : ''}
}
LIMIT ${queryStep}
`;

            const url = wbk.sparqlQuery(query)
            const headers = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }; // see https://meta.wikimedia.org/wiki/User-Agent_policy

            let res = await fetch(url, { method: 'GET', headers })
            res = await res.json();
            res = res.results.bindings;
            saveBindings(`${DIR_OUTPUT}/${langs[1] ?? langs[0]}_${langs[0]}_4_place_${countryName}.csv`, res);
            console.log('OK - ', 'runPlaceQueries', langs, countryName, countryCode, queryStep)
            break;
        } catch (e) {
            console.log('FAIL - ', 'runPlaceQueries', langs, countryName, countryCode, queryStep)
        }
    }
    return;
}

async function runQueries(outputLang) {
    for (const inputLang of LANG_TO_SOURCES[outputLang]) {
        for (const entry of Object.entries(LANG_TO_COUNTRY[inputLang])) {
            const [countryName, countryCode] = entry;
            const langs = [inputLang];
            if (inputLang !== outputLang) {
                langs.push(outputLang);
            }

            await runPersonWikipediaQueries(langs, countryName, countryCode);
            await runPlaceWikipediaQueries(langs, countryName, countryCode);
            await runPersonQueries(langs, countryName, countryCode);
            await runPlaceQueries(langs, countryName, countryCode);
        }
    }
}

Object.keys(LANG_TO_SOURCES).forEach(key => {
    runQueries(key);
})