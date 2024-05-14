import fs from 'fs'
import path from 'path'

const DIR_VALUES = './6-results'
const DIR_TESTING = './7-testing-set'
const OUTDIR_TRAINING = './7-training-set'

const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

async function getTestingSets() {
    const filenames = fs.readdirSync(DIR_VALUES);

    for (const filename of filenames) {
        const filelang = filename.slice(0, 2);

        console.log(`${DIR_VALUES}/${filename}`)
        const lines = fs.readFileSync(`${DIR_VALUES}/${filename}`).toString().split("\n");

        const skipKeys = JSON.parse(fs.readFileSync(`${DIR_TESTING}/testing_${filelang}.json`).toString())[1];

        const pairs = {}

        for (const line of lines) {
            const split = line.split("\t");
            if (split.length < 2) continue;

            const language = split[0].split('_')[0];

            if (pairs[language] === undefined) pairs[language] = [];
            pairs[language].push([language, ...split]);
        }
        let trainingSet = [];

        for (const key of Object.keys(pairs)) {
            const shuffled = shuffle(pairs[key]);
            trainingSet = trainingSet.concat(shuffled);
        }

        const trainingLines = []
        for (const pair of trainingSet) {
            if (skipKeys.includes(pair[1])) continue;

            trainingLines.push([pair[1], pair[2]].join("\t"));
        }

        fs.writeFileSync(path.join(OUTDIR_TRAINING, `${filelang}.tsv`), trainingLines.join("\n"));
    }
}

await getTestingSets();