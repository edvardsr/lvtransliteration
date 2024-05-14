import fs from 'fs'

const DIRNAME = './3-keys';
const DIRNAME_WITH_VALUE = './3-keys-with-values';
const OUTPUT_KEYS_NO_IPA = './4-keys-no-ipa'
const ALL_LANGUAGES = [
    'ko',
    'zh',
    'lv',
    'ja',
    'de',
    'en',
    'es',
    'fr',
    'it',
    'pl',
    'pt',
    'ro',
    'ru',
]

async function classifyFiles(dirname, returnInputFiles = true) {
    const filenames = fs.readdirSync(dirname);
    const result = {};
    const regex = /([a-z]*)_([a-z]*).*/gm;

    for (let filename of filenames) {
        try {
            regex.lastIndex = 0;
            const split = regex.exec(filename);

            if (!split) throw filename;
            if (!split || split[2] === undefined) throw 'a';

            const [originalFilename, outLang, inpLang] = split;

            if (returnInputFiles) {
                if (result[inpLang] === undefined) result[inpLang] = []
                result[inpLang].push(originalFilename);
            } else {
                if (result[outLang] === undefined) result[outLang] = []
                result[outLang].push(originalFilename);
            }
        } catch (e) {
            if (e !== 'a') throw e;
        }
    }

    return result;
}
const FILES = await classifyFiles(DIRNAME, true)
const FILES_OUTPUT = await classifyFiles(DIRNAME, false)

async function getKeys(filename) {
    return fs.readFileSync(filename).toString().split("\n");;
}

async function getKeyValues(filename) {
    const lines = fs.readFileSync(filename).toString().split("\n");
    const result = [];

    for (const line of lines) {
        const split = line.split(',');
        if (split && split[1]) {
            result.push(split[1]);
        }
    }

    return result;
}

async function getKeysForLanguage(lang) {
    if (!FILES[lang]) return null;

    let keys = [];
    if (FILES[lang]) {
        for (const filename of FILES[lang]) {
            const temp = await getKeys(`${DIRNAME}/${filename}`);
            
            for (const tempKey of temp) {
                if (!keys.includes(tempKey)) keys.push(tempKey);
            }
        }
    }
    if (FILES_OUTPUT[lang]) {
        for (const filename of FILES_OUTPUT[lang]) {
            const temp = await getKeyValues(`${DIRNAME_WITH_VALUE}/${filename}`);
            
            for (const tempKey of temp) {
                if (!keys.includes(tempKey)) keys.push(tempKey);
            }
        }
    }

    return keys;
}


async function getIpas() {
    for (const lang of ALL_LANGUAGES) {
        const keys = await getKeysForLanguage(lang);
        if (!keys) continue;

        fs.writeFileSync(`${OUTPUT_KEYS_NO_IPA}/${lang}.csv`, keys.join("\n"));
    }
}

getIpas()
