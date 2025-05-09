export function startLog(jobId: string, message: string) {
  console.log(`\n[JOB-${jobId.padStart(2, '0')}] 🔄 ${message}\n`);
}

export function endLog(jobId: string, message: string) {
  console.log(`\n[JOB-${jobId.padStart(2, '0')}] ✅ ${message}\n`);
}

export function errorLog(jobId: string, message: string) {
  console.log(`\n[JOB-${jobId.padStart(2, '0')}] ❌ ${message}\n`);
}
