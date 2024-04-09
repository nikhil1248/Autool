

// Import the required libraries
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

// Update with your service account credentials file
const CREDS_FILE = require('insert here');

// Update with your Google Spreadsheet ID
const SPREADSHEET_ID = 'id for spreadsheet';

// Google CSE API key
const API_KEY = 'CSE API KEY HERE'; // Update with your CSE API key
const SEARCH_ENGINE_ID = 'YOUR CSE ID'; // Update with your CSE ID

// ATS platforms
const ATS_PLATFORMS = [
    'https://gust.com/companies/fintros',
    'https://www.greenhouse.com/',
    'jobs.jobvite.com',
    'icims.com',
    'jobs.smartrecruiters.com',
    'lever.co',
    'myworkdayjobs.com',
    'jobs.ashbyhq.com'
];

// Job titles to search
const JOB_TITLES = ['React Developer', 'frontend engineer', 'Frontend engineer','senior java developer']; // Add your desired job titles

async function searchJobs(query) {
    const customsearch = google.customsearch('v1');
    try {
        const response = await customsearch.cse.list({
            auth: API_KEY,
            cx: SEARCH_ENGINE_ID,
            q: query
        });
        return response.data;
    } catch (error) {
        console.error('Error searching jobs:', error);
        return null;
    }
}

function filterJobs(results) {
    if (results.items) {
        return results.items.filter(item => ATS_PLATFORMS.some(platform => item.link.includes(platform)))
                            .map(item => ({ title: item.title, link: item.link, platform: getPlatform(item.link) }));
    } else {
        return [];
    }
}

function getPlatform(link) {
    for (const platform of ATS_PLATFORMS) {
        if (link.includes(platform)) {
            return platform;
        }
    }
    return null;
}

async function exportToSpreadsheet(jobs, spreadsheet) {
    const sheet = spreadsheet.sheetsByIndex[0];
    const rows = jobs.map(job => [job.title, job.link, job.platform]);
    await sheet.addRows(rows);
}

async function main() {
    const allJobs = [];
    for (const title of JOB_TITLES) {
        const query = `site:${ATS_PLATFORMS.join(' OR site:')} "${title}"`;
        const results = await searchJobs(query);
        if (results) {
            const filteredJobs = filterJobs(results);
            allJobs.push(...filteredJobs);
        }
    }

    const spreadsheet = new GoogleSpreadsheet(SPREADSHEET_ID);
    await setupCredentials(spreadsheet);

    if (allJobs.length > 0) {
        await exportToSpreadsheet(allJobs, spreadsheet);
    } else {
        console.log("No jobs found.");
    }
}

main();

async function setupCredentials(spreadsheet) {
    const authClient = new JWT(
      process.env.CLIENT_EMAIL,
      null,
      process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
  
    await authClient.authorize();
  
    const sheets = google.sheets('v4');
    const spreadsheetId = process.env.SPREADSHEET_ID;
  
    return { sheets, spreadsheetId, authClient };
  }