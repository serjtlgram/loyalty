const fs = require('fs');
const readline = require('readline');

async function processTranscript() {
    let content = fs.readFileSync('src/App.jsx', 'utf8');
    const logFile = 'C:\\Users\\iediu\\.gemini\\antigravity\\brain\\3a419535-c9a5-45ff-87ae-44bb5a72da0e\\.system_generated\\logs\\transcript.jsonl';
    
    const fileStream = fs.createReadStream(logFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let toolCalls = [];

    for await (const line of rl) {
        try {
            const entry = JSON.parse(line);
            if (entry.type === 'PLANNER_RESPONSE' && entry.tool_calls) {
                for (const call of entry.tool_calls) {
                    if ((call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') && 
                        call.args.TargetFile && call.args.TargetFile.includes('App.jsx')) {
                        toolCalls.push(call);
                    }
                }
            }
        } catch (e) {}
    }

    // Apply the replacements
    for (const call of toolCalls) {
        if (call.name === 'replace_file_content') {
            const start = call.args.StartLine - 1;
            const end = call.args.EndLine;
            const lines = content.split('\n');
            const targetContent = call.args.TargetContent;
            
            // Just doing a simple string replace using the target content to be safe
            // as line numbers might shift.
            if (content.includes(targetContent)) {
                content = content.replace(targetContent, call.args.ReplacementContent);
            }
        } else if (call.name === 'multi_replace_file_content') {
            let chunks = typeof call.args.ReplacementChunks === 'string' ? JSON.parse(call.args.ReplacementChunks) : call.args.ReplacementChunks;
            for (const chunk of chunks) {
                if (content.includes(chunk.TargetContent)) {
                    content = content.replace(chunk.TargetContent, chunk.ReplacementContent);
                }
            }
        }
    }

    fs.writeFileSync('src/App_recovered.jsx', content);
    console.log("Recovered App.jsx to src/App_recovered.jsx");
}

processTranscript();
