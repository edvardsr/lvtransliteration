from pinyin_to_ipa import pinyin_to_ipa
from io import open
from xpinyin import Pinyin
import json

p = Pinyin()
res = []
with open('./4-keys-no-ipa/zh.csv', 'r') as f:
    readlines=f.readlines()
    for readline in readlines:
        items=[]
        readline = readline.strip()
        pinyin = p.get_pinyin(readline, tone_marks='numbers', splitter=' ')
        try:
            for item in pinyin.split(' '):
                ipa = ''.join(pinyin_to_ipa(item)[0])
                items.append(ipa)
            res.append(",".join([readline, ''.join(items)])) #.replace('˧˩˧', '').replace('˧˥', '').replace('˥˩', '').replace('˥', '')
        except:
            pass
with open('./4-keys-with-ipa/zh_pinyin_to_ipa.csv', 'w') as f:
    f.write("\n".join(res))