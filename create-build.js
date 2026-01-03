const https = require('https');

const EXPO_TOKEN = '_PixloVMl-esZ0znNH2yhKTk3O997DCGa0snzavb';
const PROJECT_ID = '99a2d247-e734-4dde-b0f7-926207ce2815';

// GraphQL mutation to create Android credentials
const createCredentialsMutation = `
mutation CreateAndroidAppBuildCredentials($androidAppBuildCredentialsInput: AndroidAppBuildCredentialsInput!) {
  androidAppBuildCredentials {
    createAndroidAppBuildCredentials(androidAppBuildCredentialsInput: $androidAppBuildCredentialsInput) {
      id
    }
  }
}
`;

// GraphQL mutation to start build
const createBuildMutation = `
mutation CreateBuild($appId: ID!, $platform: AppPlatform!, $buildProfile: String!) {
  build {
    createBuild(appId: $appId, platform: $platform, buildProfile: $buildProfile) {
      id
      status
    }
  }
}
`;

function graphqlRequest(query, variables) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    
    const options = {
      hostname: 'api.expo.dev',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EXPO_TOKEN}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 Tentative de création du build via API Expo...');
  console.log('Project ID:', PROJECT_ID);
  
  // Try to create build directly - API will auto-generate credentials if needed
  try {
    const buildResult = await graphqlRequest(createBuildMutation, {
      appId: PROJECT_ID,
      platform: 'ANDROID',
      buildProfile: 'preview'
    });
    
    console.log('✅ Résultat:', JSON.stringify(buildResult, null, 2));
    
    if (buildResult.data?.build?.createBuild) {
      console.log('✨ Build créé avec succès!');
      console.log('Build ID:', buildResult.data.build.createBuild.id);
      console.log('Status:', buildResult.data.build.createBuild.status);
    } else if (buildResult.errors) {
      console.log('❌ Erreurs:', JSON.stringify(buildResult.errors, null, 2));
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

main();
