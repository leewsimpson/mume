import { Octokit } from 'octokit';
import pool from '../apps/api/dist/db/connection.js';
import { decryptToken } from '../apps/api/dist/services/token.service.js';

async function testGitHubAPI() {
  try {
    // Get the user's token from database
    const result = await pool.query(
      `SELECT access_token_encrypted, access_token_iv, access_token_auth_tag 
       FROM user_tokens 
       WHERE user_id = 1 AND provider = 'github'`
    );

    if (result.rows.length === 0) {
      console.log('❌ No token found for user');
      return;
    }

    const row = result.rows[0];
    const token = decryptToken({
      encryptedData: row.access_token_encrypted,
      iv: row.access_token_iv,
      authTag: row.access_token_auth_tag,
    });

    console.log('✅ Token decrypted successfully');
    console.log('Token prefix:', token.substring(0, 10) + '...');

    // Test GitHub API
    const octokit = new Octokit({ auth: token });

    console.log('\n--- Fetching repositories ---');
    const repos = await octokit.rest.repos.listForAuthenticatedUser({
      affiliation: 'owner,collaborator,organization_member',
      per_page: 100,
      sort: 'updated',
    });

    console.log(`Total repos returned: ${repos.data.length}`);
    
    // Show all repos with their permissions
    console.log('\nAll repositories:');
    repos.data.forEach((repo, i) => {
      console.log(`${i + 1}. ${repo.full_name}`);
      console.log(`   Private: ${repo.private}`);
      console.log(`   Permissions:`, repo.permissions);
      console.log('');
    });

    // Filter to push permission
    const writableRepos = repos.data.filter(r => r.permissions?.push === true);
    console.log(`\nRepos with push permission: ${writableRepos.length}`);
    writableRepos.forEach((repo, i) => {
      console.log(`${i + 1}. ${repo.full_name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
  } finally {
    await pool.end();
  }
}

testGitHubAPI();
