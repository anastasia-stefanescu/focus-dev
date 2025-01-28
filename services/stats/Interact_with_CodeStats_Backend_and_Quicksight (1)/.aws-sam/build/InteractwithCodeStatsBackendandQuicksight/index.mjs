import AWS from 'aws-sdk'
import { v4 as uuidv4 } from 'uuid'; 

const quicksight = new AWS.QuickSight({
  apiVersion: '2018-04-01',
  region: 'us-east-1'
});

const s3_instance = new AWS.S3({
  //apiVersion: '2006-03-01'
});


let dataset_arn = '';
let generated_dataset_id;
let dashboard_id = '';

const s3bucket_arn = 'arn:aws:s3:::codestatsbucket';
const s3bucket = 'codestatsbucket';
const s3Key = 'test_function/code-stats-data.csv'; // defines the path within the bucket where your file/data will be stored. 
const s3uri = `s3://${s3bucket}/${s3Key}`;


export const handler = async (event) => {
  console.log('event', event);

  const data = event.data; 
  console.log('data', data);

  try{
    const s3Response = await saveDataToS3(data);
    console.log('s3Response', s3Response);

    generated_dataset_id = uuidv4();
    console.log('generated dataset id:', generated_dataset_id);
    const datasetResponse = await createQuicksightDataset();
    console.log('datasetResponse', datasetResponse);
    dataset_arn = datasetResponse.Arn;

    return {
      statusCode: 200,
      body: JSON.stringify({ s3Response: s3Response, datasetResponse: datasetResponse}),
    };

  //   const dashboardResponse = await createDashboard();
  //   console.log('dashboardResponse', dashboardResponse);
  //   dashboard_id = dashboardResponse.DashboardId;

  //   const embedUrlResponse = await generateEmbedUrl();
  //   console.log('embedUrlResponse', embedUrlResponse);

  //   deleteQuicksightDataset();

  //   return {
  //     statusCode: 200,
  //     body: JSON.stringify({ embedUrl: embedUrlResponse.EmbedUrl }),
  //   };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Some error happened in handler' }),
    };
  }  
};

const saveDataToS3 = async(data) => {
  const params = {
    Bucket: s3bucket,
    Key: s3Key,
    Body: JSON.stringify(data),
    ContentType: 'application/json'
  };
  const s3Response = await s3_instance.putObject(params).promise();
  return s3Response;
}

const createQuicksightDataset = async() => {
  const createDatasetParams = {
    AwsAccountId: '443370690315',
    DatasetId: generated_dataset_id, // ?
    Name: 'CodeStatsTestDataset',
    Source: {
      S3Source: {
        DataSourceArn: s3bucket_arn, // ?
        FileFormat: 'CSV',
        S3Uri: s3uri,
      },
    },
    Permissions: [],
  };
  const datasetResponse = await quicksight.createDataSet(createDatasetParams).promise();
  return datasetResponse;
}

// const createDashboard = async() => {
//   const createDashboardParams = {
//     AwsAccountId: '443370690315',
//     DashboardId: 'codestats-dashboard',
//     Name: 'CodeStatsReportDashboard',
//     SourceEntity: {
//       SourceTemplate: {
//         DataSetReferences: [
//           {
//             DataSetArn: dataset_arn,
//             DataSetPlaceholder: 'ReportDataset',
//           },
//         ],
//       },
//     },
//   };

//   const dashboardResponse = await quicksight.createDashboard(createDashboardParams).promise();

//   return dashboardResponse;

// }

// const generateEmbedUrl = async() => {

//   const embedUrlParams = {
//     AwsAccountId: '443370690315',
//     DashboardId: dashboard_id,
//     IdentityType: 'ANONYMOUS', // You can choose the identity type based on your needs
//   };

//   const embedUrlResponse = await quicksight.generateEmbedUrl(generateEmbedUrlParams).promise();

//   return embedUrlResponse;
// }

const deleteQuicksightDataset = async (datasetArn) => {
  const params = {
      AwsAccountId: '443370690315',
      DataSetId: datasetArn
  };
  return await quicksight.deleteDataSet(params).promise();
}