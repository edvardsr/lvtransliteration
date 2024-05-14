import fs from 'fs'
import { fromKana } from 'hepburn';
import {distance} from 'fastest-levenshtein'
import { transliterate } from 'transliteration';
import { pinyin } from 'pinyin-pro';

const DIR_VALUE = './3-keys-with-values';
const DIR_IPA = './5-standardised-ipa';
const DIR_OUT = './6-results'
const MAX_LENGTH = 15;

async function classifyDictionaryFiles(dirname) {
    const filenames = fs.readdirSync(dirname);
    const result = {};
    const regex = /([a-z]*).*/gm;

    for (let filename of filenames) {
        try {
            regex.lastIndex = 0;
            const split = regex.exec(filename);

            if (!split || split[1] === undefined) throw 'a';

            const [originalFilename, outLang] = split;

            if (result[outLang] === undefined) result[outLang] = []
            result[outLang].push(originalFilename);
        } catch (e) {
            if (e !== 'a') throw e;
        }
    }

    return result;
}
const DICTIONARY_FILES = await classifyDictionaryFiles(DIR_IPA)

async function getIpaDictionaries() {
    const filenames = fs.readdirSync(DIR_IPA);
    const res = {};

    for (const lang of filenames) {
        res[lang] = {};
        const lines = fs.readFileSync(`${DIR_IPA}/${lang}`).toString().split("\n");
        for (const line of lines) {
            const split = line.split(",");
            try {
                if (split[0] === 'constructor') continue;
                if (res[lang][split[0]] === undefined) res[lang][split[0]] = [];
                res[lang][split[0]].push(split[1]);
            } catch (e) {
                throw 'a';
            }
        }
    }

    return res;
}
const IPA_DICTIONARIES = await getIpaDictionaries();

async function classifyFiles(dirname) {
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

            if (result[outLang] === undefined) result[outLang] = {}
            if (result[outLang][inpLang] === undefined) result[outLang][inpLang] = []
            result[outLang][inpLang].push(originalFilename);
        } catch (e) {
            if (e !== 'a') throw e;
        }
    }

    return result;
}
const FILES = await classifyFiles(DIR_VALUE)

async function getPairs(filename) {
    const split = fs.readFileSync(filename).toString().split("\n");
    const res = [];
    for (let item of split) {
        const splitTwo = item.split(',');
        if (splitTwo.length) {
            res.push(splitTwo);
        }
    }

    return res;
}

async function transliterateWord(language, word) {
    let tmpw = word;
    if (language === 'ja') {
        tmpw = fromKana(word).toLowerCase();
    } else if (language === 'zh') {
        tmpw = pinyin(word, {toneType: 'none', type: 'array'}).join('')
    }

    return transliterate(tmpw);
}

async function adjustIpa(language, word) {
    return word.replaceAll(/[˥˦˧˨˩꜒꜓꜔꜕꜖]/gu, '')
}

async function isDistanceOk(inpT, outT, inpIpa, outIpa) {
    const distanceT = distance(inpT, outT);
    const distanceIpa = distance(inpIpa, outIpa);

    let isOk = 0;
    let tokenOk = 0;
    let ipaOk = 0;
    if (distanceIpa < outIpa.length) ipaOk++;
    if (distanceT < outT.length) tokenOk++;
    if (distanceIpa < inpIpa.length) ipaOk++;
    if (distanceT < inpT.length) tokenOk++;
    isOk = ((tokenOk + ipaOk) >= 3) || (tokenOk === 2);

    return isOk;
}

async function processFiles() {
    for (let outLang of Object.keys(FILES)) {
        const lines = [];
        let resForLang = [];
        const fileLangKeys = [];
        for (const fileKey of Object.keys(FILES[outLang])) {
            if (fileKey !== outLang) fileLangKeys.push(fileKey);
        }
        const outLangKeys = {};
        fileLangKeys.push(outLang);
        for (let inpLang of fileLangKeys) {
            if (resForLang[inpLang] === undefined) resForLang[inpLang] = {};

            for (let filename of FILES[outLang][inpLang]) {
                let pairs = await getPairs(`${DIR_VALUE}/${filename}`);

                for (let pair of pairs) {
                    for (let dictionaryFile of DICTIONARY_FILES[inpLang]) {
                        if (IPA_DICTIONARIES[dictionaryFile][pair[0]] === undefined) continue;
                        for (let inputIpa of IPA_DICTIONARIES[dictionaryFile][pair[0]]) {
                            for (let dictionaryFileOut of DICTIONARY_FILES[outLang]) {
                                if (IPA_DICTIONARIES[dictionaryFileOut][pair[1]] === undefined) continue;
                                let breakout = false;
                                for (let outputIpa of IPA_DICTIONARIES[dictionaryFileOut][pair[1]]) {
                                    const len1 = inputIpa.length <= MAX_LENGTH
                                    const len2 = pair[1].length <= MAX_LENGTH;
                                    if (!(len1 && len2)) continue;
                                    const isOk = await isDistanceOk(
                                        await transliterateWord(inpLang, pair[0]),
                                        await transliterateWord(outLang, pair[1]),
                                        await adjustIpa(inpLang, inputIpa),
                                        await adjustIpa(outLang, outputIpa)
                                    );
                                    if (
                                        len1 && len2 && isOk
                                    ) {
                                        if (DATASET_METHOD === 2) {
                                            if ( // method C
                                                (resForLang[inpLang][inputIpa] !== undefined && inpLang === outLang)
                                                || inpLang !== outLang
                                            ) {
                                                outLangKeys[pair[1]] = 1;
                                            }
                                        }
                                        if (resForLang[inpLang][inputIpa] === undefined) {
                                            resForLang[inpLang][inputIpa] = [pair[1]]

                                            if (DATASET_METHOD) {
                                                if (inpLang === outLang) {
                                                    delete outLangKeys[pair[1]];
                                                }
                                            }
                                        }
                                        else if (DATASET_METHOD === 1 && inpLang !== outLang) { // method B
                                            outLangKeys[pair[1]] = 1;
                                        }
                                        breakout = true;
                                        break;
                                    }
                                }
                                if (breakout) break;
                            }
                        }
                    }
                }
            }

            if (inpLang === outLang) {
                for (const firstInPair of Object.keys(outLangKeys)) {
                    const pair = [firstInPair, firstInPair];

                    for (let dictionaryFile of DICTIONARY_FILES[inpLang]) {
                        if (IPA_DICTIONARIES[dictionaryFile][pair[0]] === undefined) continue;
                        for (let inputIpa of IPA_DICTIONARIES[dictionaryFile][pair[0]]) {
                            for (let dictionaryFileOut of DICTIONARY_FILES[outLang]) {
                                if (IPA_DICTIONARIES[dictionaryFileOut][pair[1]] === undefined) continue;
                                let breakout = false;
                                for (let outputIpa of IPA_DICTIONARIES[dictionaryFileOut][pair[1]]) {
                                    const len1 = inputIpa.length <= MAX_LENGTH
                                    const len2 = pair[1].length <= MAX_LENGTH;
                                    if (!(len1 && len2)) continue;
                                    const isOk = await isDistanceOk(
                                        await transliterateWord(inpLang, pair[0]),
                                        await transliterateWord(outLang, pair[1]),
                                        inputIpa,
                                        outputIpa
                                    );
                                    if (
                                        len1 && len2 && isOk
                                    ) {
                                        if (resForLang[inpLang][inputIpa] === undefined) {
                                            resForLang[inpLang][inputIpa] = [pair[1]]
                                        }
                                        breakout = true;
                                        break;
                                    }
                                }
                                if (breakout) break;
                            }
                        }
                    }
                }
            }

            for (let inpLangKey of Object.keys(resForLang[inpLang])) {
                for (let value of resForLang[inpLang][inpLangKey]) {
                    const newLine = [`${inpLang}_${inpLangKey}`, value].join("\t");
                    if (!lines.includes(newLine)) {
                        lines.push(newLine);
                    }
                }
            }
        }

        fs.writeFileSync(`${DIR_OUT}/${outLang}.tsv`, lines.join("\n"));
    }
}

const DATASET_METHOD = 2; // 0 - method A, 1 - method B, 2 - method C
processFiles();