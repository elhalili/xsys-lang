import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

type Variable = {
    name: string;
    value: string;
};

type Condition = {
    variable: string;
    negated: boolean; 
};

type LogicalOperator = 'AND' | 'OR';

type Expression = {
    type: 'condition';
    condition: Condition;
} | {
    type: 'logical';
    operator: LogicalOperator;
    left: Expression;
    right: Expression;
};

type Rule = {
    expression: Expression; 
    result: string;
};

type LanguageInput = {
    statements: Variable[];
    results: Variable[];
    rules: Rule[];
};

function parseInput(input: string): LanguageInput {
    const stmtRegex = /stmt\s*([\s\S]*?)\s*endstmt/;
    const resultsRegex = /results\s*([\s\S]*?)\s*endresults/;
    const rulesRegex = /rules\s*([\s\S]*?)\s*endrules/;

    if (!stmtRegex.test(input)) {
        throw new SyntaxError('Missing "stmt" block. Ensure the input contains a "stmt" section.');
    }
    if (!resultsRegex.test(input)) {
        throw new SyntaxError('Missing "results" block. Ensure the input contains a "results" section.');
    }
    if (!rulesRegex.test(input)) {
        throw new SyntaxError('Missing "rules" block. Ensure the input contains a "rules" section.');
    }

    const stmtBlock = input.match(stmtRegex)?.[1] || '';
    const resultsBlock = input.match(resultsRegex)?.[1] || '';
    const rulesBlock = input.match(rulesRegex)?.[1] || '';

    const parseVariables = (block: string, blockName: string): Variable[] => {
        return block
            .split('\n')
            .filter(line => line.trim())
            .map((line, index) => {
                const parts = line.split('=').map(part => part.trim());
                if (parts.length !== 2) {
                    throw new SyntaxError(
                        `Invalid variable declaration in ${blockName} block at line ${index + 1}: "${line}". ` +
                        'Expected format: <name> = <value>'
                    );
                }
                const [name, value] = parts;
                return { name, value };
            });
    };

    const parseCondition = (condStr: string): Condition => {
        const negated = condStr.includes('NOT');
        const variable = condStr.replace(/NOT/i, '').trim();
        if (!variable) {
            throw new SyntaxError(`Invalid condition: "${condStr}". Expected format: "NOT <variable>" or "<variable>"`);
        }
        return { variable, negated };
    };

    const parseExpression = (exprStr: string): Expression => {
        exprStr = exprStr.trim();

        if (exprStr.startsWith('(') && exprStr.endsWith(')')) {
            return parseExpression(exprStr.slice(1, -1));
        }

        let depth = 0;
        for (let i = 0; i < exprStr.length; i++) {
            const char = exprStr[i];
            if (char === '(') depth++;
            if (char === ')') depth--;
            if (depth === 0 && (exprStr.startsWith('AND', i) || exprStr.startsWith('OR', i))) {
                const operator = exprStr.substring(i, i + 3).trim() as LogicalOperator;
                const left = exprStr.substring(0, i).trim();
                const right = exprStr.substring(i + 3).trim();
                if (!left || !right) {
                    throw new SyntaxError(
                        `Invalid logical expression: "${exprStr}". ` +
                        'Expected format: "<expression> AND <expression>" or "<expression> OR <expression>"'
                    );
                }
                return {
                    type: 'logical',
                    operator,
                    left: parseExpression(left),
                    right: parseExpression(right),
                };
            }
        }

        
        return {
            type: 'condition',
            condition: parseCondition(exprStr),
        };
    };

    
    const parseRules = (block: string): Rule[] => {
        return block
            .split('\n')
            .filter(line => line.trim())
            .map((line, index) => {
                const match = line.match(/IF\s+(.*)\s+THEN\s+(\w+)/);
                if (!match) {
                    throw new SyntaxError(
                        `Invalid rule at line ${index + 1}: "${line}". ` +
                        'Expected format: "IF <condition> THEN <result>"'
                    );
                }
                const [, conditionsStr, result] = match;
                try {
                    return {
                        expression: parseExpression(conditionsStr),
                        result,
                    };
                } catch (error) {
                    if (error instanceof Error) {
                        throw new SyntaxError(
                            `Error in rule at line ${index + 1}: "${line}". ` +
                            `Details: ${error.message}`
                        );
                    } 

                    throw new SyntaxError(
                      `Error in rule at line ${index + 1}: "${line}". ` +
                      'An unknown error occurred.'
                    );
                    
                }
            });
    };

    try {
        return {
            statements: parseVariables(stmtBlock, 'stmt'),
            results: parseVariables(resultsBlock, 'results'),
            rules: parseRules(rulesBlock),
        };
    } catch (error) {
        
        if (error instanceof Error) {
            throw new SyntaxError(`Failed to parse input: ${error.message}`);
        } else {
            throw new SyntaxError('Failed to parse input: An unknown error occurred.');
        }
    }
}

function generateHTML(data: LanguageInput, title: string): string {
    const statementsHTML = data.statements
        .map(
            stmt => `
            <div class="statement">
                <label>${stmt.value}</label>
                <div class="options">
                    <label><input type="radio" name="${stmt.name}" value="yes"> Yes</label>
                    <label><input type="radio" name="${stmt.name}" value="no"> No</label>
                </div>
            </div>
        `,
        )
        .join('');

    const rulesJSON = JSON.stringify(data.rules, null, 2);
    const statementsJSON = JSON.stringify(data.statements, null, 2);
    const resultsJSON = JSON.stringify(data.results, null, 2);

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Computer Diagnostic System</title>
            <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"></script>
            <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/universal-sentence-encoder"></script>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f9;
                    margin: 0;
                    padding: 20px;
                }
                .container {
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    max-width: 800px;
                    margin: 0 auto;
                }
                h1 {
                    font-size: 1.5rem;
                    color: #333;
                    margin-bottom: 1.5rem;
                    text-align: center;
                }
                .statement {
                    margin-bottom: 1rem;
                    padding: 1rem;
                    background: #f9f9f9;
                    border-radius: 4px;
                    border: 1px solid #ddd;
                }
                .options {
                    display: flex;
                    gap: 1rem;
                }
                .options label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: normal;
                    color: #666;
                }
                button {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 1rem;
                    margin-top: 1rem;
                }
                button:hover {
                    background: #0056b3;
                }
                #result {
                    margin-top: 1.5rem;
                    padding: 1rem;
                    background: #e9f5ff;
                    border-radius: 4px;
                    border: 1px solid #007bff;
                    color: #007bff;
                    font-weight: bold;
                }
                #paragraphInput {
                    width: 100%;
                    padding: 0.5rem;
                    margin-bottom: 1rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    min-height: 100px;
                }
                .match-highlight {
                    background-color: #e6f7ff;
                    padding: 2px 5px;
                    border-radius: 3px;
                }
                #nlpResults {
                    margin: 1rem 0;
                    padding: 1rem;
                    background: #f8f9fa;
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>${title}</h1>
                
                <div id="nlpSection">
                    <h2>Describe your issue</h2>
                    <textarea id="paragraphInput" placeholder="Describe your problem in detail..."></textarea>
                    <button id="analyzeBtn">Analyze Description</button>
                    <div id="nlpResults"></div>
                </div>
                
                <h2>Answer the following questions:</h2>
                <form id="ruleForm">
                    ${statementsHTML}
                    <button type="submit">Diagnose</button>
                </form>
                
                <h2>Result:</h2>
                <div id="result"></div>
            </div>

            <script>
                const rules = ${rulesJSON};
                const allStatements = ${statementsJSON};
                const allResults = ${resultsJSON};
                
                let useModel;
                async function loadModel() {
                    try {
                        useModel = await use.load();
                        console.log("NLP model loaded successfully");
                    } catch (error) {
                        console.error("Failed to load NLP model:", error);
                    }
                }
                loadModel();
                
                const evaluateExpression = (expr, answers) => {
                    if (expr.type === 'condition') {
                        const answer = answers[expr.condition.variable];
                        if (expr.condition.negated) {
                            return answer === 'no';
                        } else {
                            return answer === 'yes';
                        }
                    } else if (expr.type === 'logical') {
                        const left = evaluateExpression(expr.left, answers);
                        const right = evaluateExpression(expr.right, answers);
                        if (expr.operator === 'AND') {
                            return left && right;
                        } else if (expr.operator === 'OR') {
                            return left || right;
                        }
                    }
                    return false;
                };

                async function analyzeParagraph() {
                    const paragraph = document.getElementById('paragraphInput').value.trim();
                    if (!paragraph) {
                        alert("Please describe your issue first");
                        return;
                    }
                    
                    if (!useModel) {
                        alert("NLP model is still loading. Please wait a moment and try again.");
                        return;
                    }
                    
                    try {
                        const statementTexts = allStatements.map(s => s.value);
                        const textsToCompare = [paragraph, ...statementTexts];
                        
                        const embeddings = await useModel.embed(textsToCompare);
                        const paragraphEmbedding = embeddings.slice([0, 0], [1, -1]);
                        const statementEmbeddings = embeddings.slice([1, 0], [statementTexts.length, -1]);
                        
                        const similarityScores = tf.matMul(
                            paragraphEmbedding,
                            statementEmbeddings,
                            false,
                            true
                        ).dataSync();
                        
                        const matches = [];
                        const threshold = 0.63;
                        for (let i = 0; i < similarityScores.length; i++) {
                            if (similarityScores[i] > threshold) {
                                matches.push({
                                    statement: allStatements[i],
                                    similarity: similarityScores[i]
                                });
                            }
                        }
                        
                        const resultsDiv = document.getElementById('nlpResults');
                        if (matches.length === 0) {
                            resultsDiv.innerHTML = '<p>No specific issues detected in your description.</p>';
                            return;
                        }
                        
                        let html = '<h3>Detected Issues:</h3><ul>';
                        matches.sort((a, b) => b.similarity - a.similarity).forEach(match => {
                            // Auto-select the radio button for matched statements
                            const radioYes = document.querySelector(\`input[name="\${match.statement.name}"][value="yes"]\`);
                            if (radioYes) radioYes.checked = true;
                            
                            html += \`
                                <li>
                                    <span class="match-highlight">\${match.statement.value}</span>
                                    (confidence: \${Math.round(match.similarity * 100)}%)
                                </li>
                            \`;
                        });
                        html += '</ul>';
                        
                        resultsDiv.innerHTML = html;
                    } catch (error) {
                        console.error("Error analyzing paragraph:", error);
                        document.getElementById('nlpResults').innerHTML = 
                            '<p>Error analyzing your description. Please try again.</p>';
                    }
                }

                document.getElementById('analyzeBtn').addEventListener('click', analyzeParagraph);

                document.getElementById('ruleForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const answers = {};
                    const paragraph = document.getElementById('paragraphInput').value.trim();
                    
                    formData.forEach((value, key) => {
                        answers[key] = value;
                    });

                    let result = '';
                    rules.forEach(rule => {
                        if (evaluateExpression(rule.expression, answers)) {
                            const resultVar = allResults.find(r => r.name === rule.result);
                            if (resultVar) {
                                result = resultVar.value;
                            }
                        }
                    });

                    if (paragraph && useModel) {
                        try {
                            const resultTexts = allResults.map(r => r.value);
                            const textsToCompare = [paragraph, ...resultTexts];
                            
                            const embeddings = await useModel.embed(textsToCompare);
                            const paragraphEmbedding = embeddings.slice([0, 0], [1, -1]);
                            const resultEmbeddings = embeddings.slice([1, 0], [resultTexts.length, -1]);
                            
                            const similarityScores = tf.matMul(
                                paragraphEmbedding,
                                resultEmbeddings,
                                false,
                                true
                            ).dataSync();
                            
                            let maxSimilarity = -1;
                            let bestMatch = null;
                            for (let i = 0; i < similarityScores.length; i++) {
                                if (similarityScores[i] > maxSimilarity) {
                                    maxSimilarity = similarityScores[i];
                                    bestMatch = allResults[i].value;
                                }
                            }
                            
                            if (maxSimilarity > 0.4) {
                                result = bestMatch;
                            }
                        } catch (error) {
                            console.error("Error analyzing paragraph for results:", error);
                        }
                    }

                    document.getElementById('result').innerHTML = result || 
                        '<p>No specific issue identified. Your system may be functioning normally.</p>';
                });
            </script>
        </body>
        </html>
    `;
}

function generateJSON(data: LanguageInput): string {
    return JSON.stringify(
        {
            statements: data.statements,
            results: data.results,
            rules: data.rules,
        },
        null,
        2,
    );
}

const program = new Command();

program
    .version('1.0.0')
    .description('A CLI tool to generate HTML or JSON from a custom language input.')
    .requiredOption('-i, --input <input>', 'Input file with .xsys extension')
    .option('-T, --title <header>', 'Input the header that will be generated if you chosen HTML.', 'Expert System')
    .option('-t, --type <type>', 'Output type (html or json)', 'html')
    .option('-o, --output <output>', 'Output file name', 'output')
    .option('-h, --help', 'Display help for the CLI')
    .parse(process.argv);

const options = program.opts();

if (options.help) {
    program.help();
} else {
    
    if (!options.input.endsWith('.xsys')) {
        console.error('Input file must have a .xsys extension.');
        process.exit(1);
    }

    
    const inputFilePath = path.resolve(options.input);
    if (!fs.existsSync(inputFilePath)) {
        console.error(`Input file not found: ${inputFilePath}`);
        process.exit(1);
    }

    const input = fs.readFileSync(inputFilePath, 'utf-8');

    try {
        
        const parsedData = parseInput(input);
        let outputData: string;

        outputData = (options.type === 'json')? generateJSON(parsedData): generateHTML(parsedData, options.title);

        const outputFileName = `${options.output}.${options.type}`;
        fs.writeFileSync(outputFileName, outputData);
        console.log(`File generated: ${outputFileName}`);
    } catch (error) {
        
        if (error instanceof SyntaxError) {
            console.error(`Syntax Error: ${error.message}`);
        } else if (error instanceof Error) {
            console.error(`An unexpected error occurred: ${error.message}`);
        } else {
            console.error('An unexpected error occurred.');
        }
        process.exit(1);
    }
}
