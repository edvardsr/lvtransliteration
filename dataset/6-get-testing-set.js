import fs from 'fs'
import path from 'path'

const DIR_VALUES = './6-results'
const OUTDIR = './7-testing-set'
const OUTDIR_TRAINING = './7-training-set'
const EXAMPLE_COUNT = 15;

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
        const res = [[],[],[]];
        const resTraining = [[],[],[]];

        console.log(`${DIR_VALUES}/${filename}`)
        const lines = fs.readFileSync(`${DIR_VALUES}/${filename}`).toString().split("\n");

        const pairs = {}

        for (const line of lines) {
            const split = line.split("\t");
            if (split.length < 2) continue;

            const language = split[0].split('_')[0];

            if (pairs[language] === undefined) pairs[language] = [];
            pairs[language].push([language, ...split]);
        }
        let trainingSet = [];
        const exampleCounts = {};
        let exampleCountSum = 0;

        for (const key of Object.keys(pairs)) {
            const shuffled = shuffle(pairs[key]);
            exampleCounts[key] = EXAMPLE_COUNT;
            exampleCountSum += exampleCounts[key];
            for (const item of shuffled.slice(0, exampleCounts[key])) {
                res[0].push(item[0]);
                res[1].push(item[1]);
                res[2].push(item[2]);
            }
            const concatForTraining = shuffled.slice(exampleCounts[key]);
            trainingSet = trainingSet.concat(concatForTraining);
            for (const item of shuffle(concatForTraining).slice(0, exampleCounts[key])) {
                resTraining[0].push(item[0]);
                resTraining[1].push(item[1]);
                resTraining[2].push(item[2]);
            }
        }
        for (const key of Object.keys(pairs)) {
            res[0].push('total');
            res[1].push(key);
            res[2].push(exampleCounts[key]);
            resTraining[0].push('total');
            resTraining[1].push(key);
            resTraining[2].push(exampleCounts[key]);
        }
        res[0].push('total')
        res[1].push('all');
        res[2].push(exampleCountSum);
        resTraining[0].push('total')
        resTraining[1].push('all');
        resTraining[2].push(exampleCountSum);

        const trainingLines = []
        for (const pair of trainingSet) {
            trainingLines.push([pair[1], pair[2]].join("\t"));
        }

        fs.writeFileSync(path.join(OUTDIR, `testing_${filelang}.json`), JSON.stringify(res));
        fs.writeFileSync(path.join(OUTDIR, `verify_${filelang}.json`), JSON.stringify(resTraining));
        fs.writeFileSync(path.join(OUTDIR_TRAINING, `${filelang}.tsv`), trainingLines.join("\n"));
    }
}

await getTestingSets();