from io import open
import os
from ipatok import tokenise
import opencc
import epitran

langmap = {
    'en': 'eng-Latn',
    'de': 'deu-Latn-nar',
    'es': 'spa-Latn',
    'fr': 'fra-Latn-rev',
    'it': 'ita-Latn',
    'ja': 'jpn-Ktkn',
    'ko': 'kor-Hang',
    'pl': 'pol-Latn',
    'pt': 'por-Latn',
    'ro': 'ron-Latn',
    'ru': 'rus-Cyrl',
    # 'zh': 'cmn-Hans'
}

jaReplacements = {
    'ヶ': 'ga'
}

# cedict_file = 'cedict_ts.u8'
converter = opencc.OpenCC('hk2s.json')

def readKeysFromFile(filename):
    # Read the file and split into lines
    lines = open(filename, encoding='utf-8').\
        read().strip().split('\n')

    return lines

def processLanguages(dir_keys, outdir):
    lang_to_keys = {}

    for filename in sorted(os.listdir(dir_keys)):
        language = filename[:2]

        lang_to_keys[language] = filename
    
    for language in lang_to_keys.keys():
        if not language in langmap:
            continue
        print('fetching keys...')
        keys = readKeysFromFile(os.path.join(dir_keys, lang_to_keys[language]))
        res = {}

        # if language == 'zh':
        #     eptrn = epitran.Epitran(langmap[language], cedict_file=cedict_file)
        # else:
        eptrn = epitran.Epitran(langmap[language])

        it=0
        keylen = len(keys)
        print(language, keylen)
        for key in keys:
            it += 1
            transliterated = key
            if language == 'ja':
                for replacementKey in jaReplacements.keys():
                    transliterated = transliterated.replace(replacementKey, jaReplacements[replacementKey])
            res[key] = eptrn.transliterate(transliterated)
            if it % 1000 == 0:
                print('%s/%s' % (it, keylen))
        
        lines = []
        it = 0
        for key in keys:
            it += 1
            if it % 500 == 0:
                print('%s/%s' % (it, keylen))
                print(res[key])
            joined = ','.join([key, res[key]])
            if not joined in lines:
                lines.append(joined)

        print("saving...")
        f = open(os.path.join(outdir, '%s_epitran.csv' % language), "w")
        f.write("\n".join(lines))
        f.close()

dir_keys = './4-keys-no-ipa'
outdir = './4-keys-with-ipa'
processLanguages(dir_keys, outdir)
