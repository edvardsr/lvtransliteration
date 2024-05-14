from io import open
import os
from ipatok import tokenise
import opencc
import regex as re
import pykakasi

converter = opencc.OpenCC('hk2s.json')
kks = pykakasi.kakasi()

def readFromFile(filename):
    # Read the file and split into lines
    lines = open(filename, encoding='utf-8').\
        read().strip().split('\n')

    # Split every line into pairs
    pairs = [[s for s in l.split(',')] for l in lines]

    return pairs

def standardiseIpa(word, force = False):
    word = word.replace('ʓ', 'ʑ')
    if force:
        return ''.join(tokenise(word, strict=False, replace=True, diphthongs=False, tones=True, unknown=False))
    return ''.join(tokenise(word, strict=True, replace=True, diphthongs=False, tones=True, unknown=False))

def saveToFile(pairs, filename):
    lines = []
    for pair in pairs:
        lines.append(",".join(pair))
    
    f = open(filename, "w")
    f.write("\n".join(lines))
    f.close()

for filename in sorted(os.listdir('./4-keys-with-ipa')):
    print(filename)
    pairs = readFromFile('./4-keys-with-ipa/' + filename)
    newPairs = []
    for pair in pairs:
        if '-' in pair[0]:
            continue
        if len(pair) > 1:
            if filename.startswith('zh_'):
                pair[0] = converter.convert(pair[0])
            elif filename.startswith('ja_'):
                res = []
                for item in kks.convert(pair[0]):
                    res.append(item['kana'])
                pair[0] = ''.join(res)
            try:
                pair[1] = standardiseIpa(pair[1])
                newPairs.append(pair)
            except Exception as e:
                if "COMBINING DOUBLE VERTICAL LINE BELOW" in str(e) and filename.startswith('ko_'):
                    test = standardiseIpa(pair[1].replace(u"\u0348", ''))
                    pair[1] = standardiseIpa(pair[1], True)
                    newPairs.append(pair)
                else:
                    print(e)
                    print(filename, pair)
            

    saveToFile(newPairs, './5-standardised-ipa/' + filename)