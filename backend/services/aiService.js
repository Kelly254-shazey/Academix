const { spawn } = require('child_process');
const path = require('path');

class AIService {
  async getInsights() {
    // Call Python scripts for AI models
    const absenteeism = await this.runPythonScript('absenteeism_prediction.py');
    const punctuality = await this.runPythonScript('punctuality_scoring.py');
    const anomalies = await this.runPythonScript('anomaly_detection.py');

    return {
      absenteeism_predictions: JSON.parse(absenteeism),
      punctuality_scores: JSON.parse(punctuality),
      anomalies: JSON.parse(anomalies)
    };
  }

  runPythonScript(scriptName) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [path.join(__dirname, '../../ai-engine', scriptName)]);
      let data = '';

      pythonProcess.stdout.on('data', (chunk) => {
        data += chunk;
      });

      pythonProcess.stderr.on('data', (chunk) => {
        console.error(`Python script error: ${chunk}`);
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(data);
        } else {
          reject(new Error(`Python script exited with code ${code}`));
        }
      });
    });
  }
}

module.exports = new AIService();
