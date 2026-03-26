const path = require('node:path');
const { extractTextFromFile } = require('../utils/extractTextFromFile');
const { parseQuestionsFromText } = require('../utils/parseQuestions');

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Cach dung: node src/scripts/testParseExam.js <duong_dan_file>');
    process.exit(1);
  }

  try {
    const resolvedPath = path.resolve(inputPath);

    const rawText = await extractTextFromFile(resolvedPath);

    console.log('========== RAW TEXT ==========\n');
    console.log(rawText);
    console.log('\n========== END RAW TEXT ==========\n');

    const questions = parseQuestionsFromText(rawText);

    console.log('========== PARSED JSON ==========\n');
    console.log(
      JSON.stringify(
        {
          sourceFile: path.basename(resolvedPath),
          total: questions.length,
          questions,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error('Loi:', error.message);
    process.exit(1);
  }
}

main();