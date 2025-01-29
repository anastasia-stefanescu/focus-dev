import AWS from 'aws-sdk'
import { v4 as uuidv4 } from 'uuid'; 

const quicksight = new AWS.QuickSight({
  apiVersion: '2018-04-01',
  region: 'us-east-1'
});

const s3_instance = new AWS.S3({
  //apiVersion: '2006-03-01'
});

const my_account_id = '443370690315';
const quicksight_user_arn = "arn:aws:quicksight:us-east-1:443370690315:user/default/443370690315";

const s3bucket_arn = 'arn:aws:s3:::codestatsbucket';
const s3bucket = 'codestatsbucket';
const s3Key = 'test_function/code-stats-activities.json'; // defines the path within the bucket where your file/data will be stored. 
const s3uri = `s3://${s3bucket}/${s3Key}`;

//find this out using : aws quicksight list-data-sources --aws-account-id 443370690315 --region us-east-1
const s3dataSource_name = "test_data_source";
const s3datasource_arn = "arn:aws:quicksight:us-east-1:443370690315:datasource/02092dfc-d519-42fd-99f4-43b5264a7436"
const s3datasource_id = 'a6e16c33-9152-46b1-96ba-4338c74e44d8'

let dataset_arn = '';
let generated_dataset_id = '';
const new_dataset_name = 'test_dataset';

const dashboard_id = 'test_dashboard_id';
const dashboard_name = 'test_dashboard';

const template_arn = "arn:aws:quicksight:us-east-1:443370690315:template/my-test-template-1";

export const handler = async (event) => {
  console.log('event', event);

  const data = event.data; 
  console.log('data', data);

  try{
    const s3Response = await saveDataToS3(data);
    console.log('s3Response', s3Response);

    // generated_dataset_id = uuidv4();
    // console.log('generated dataset id:', generated_dataset_id);
    // const datasetResponse = await createQuicksightDataset();
    // console.log('datasetResponse', datasetResponse);
    // dataset_arn = datasetResponse.Arn;

    
    // //generated_dashboard_id = uuidv4();
    // const dashboardResponse = await createDashboard();
    // console.log('dashboardResponse', dashboardResponse);
    // dashboard_id = dashboardResponse.DashboardId;


    const embedUrlResponse = await generateEmbedUrl();
    
    //   deleteQuicksightDataset();

    return {
      statusCode: 200,
      body: JSON.stringify({ embedUrl: embedUrlResponse.EmbedUrl }),
    };

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
    AwsAccountId: my_account_id,
    DataSetId: generated_dataset_id, // ?
    Name: new_dataset_name,
    ImportMode: 'SPICE',  // imported data
    PhysicalTableMap: { // Example of a simple physical table mapping using an S3 source
      'MyPhysicalTableMapUsingS3UniqueStringKey': {  // This key can be any string, but must be unique within PhysicalTableMap
        S3Source: {
          DataSourceArn: s3datasource_arn,
          InputColumns: [{ Name: "activityDuration", Type: 'STRING',},
                         { Name: "startTime", Type: 'STRING',},
                         { Name: "activityType", Type: 'STRING'} ],
          UploadSettings: {
            Format: 'JSON'
          }
        }
      }
    },
    Permissions: [
      {
        Principal: quicksight_user_arn,
        Actions: ["quicksight:DescribeDataSet","quicksight:DescribeDataSetPermissions","quicksight:PassDataSet","quicksight:DescribeIngestion","quicksight:ListIngestions","quicksight:UpdateDataSet","quicksight:DeleteDataSet","quicksight:CreateIngestion","quicksight:CancelIngestion","quicksight:UpdateDataSetPermissions"]
      }
    ]
  };
  const datasetResponse = await quicksight.createDataSet(createDatasetParams).promise();
  return datasetResponse;
}

const createDashboard = async() => {
  const createDashboardParams = {
    AwsAccountId: my_account_id,  
    DashboardId: dashboard_id,  // ensure this ID is unique within your account
    Name: dashboard_name,  
    SourceEntity: {
      SourceTemplate: {
        Arn: template_arn,  
        DataSetReferences: [
          {
            DataSetArn: "arn:aws:quicksight:us-east-1:443370690315:dataset/efae9db3-ce3f-4457-81ac-f6ac1504ff6c",
            DataSetPlaceholder: "test_data_source"  
          },
        ],
      },
    },
  };
  const dashboardResponse = await quicksight.createDashboard(createDashboardParams).promise();
  return dashboardResponse;
}

const generateEmbedUrl = async() => {

  const embedUrlParams = {
    AwsAccountId: my_account_id,
    DashboardId: dashboard_id,
    IdentityType: 'QUICKSIGHT', // You can choose the identity type based on your needs
    UserArn: quicksight_user_arn
  };

  const embedUrlResponse = await quicksight.getDashboardEmbedUrl(embedUrlParams).promise();

  return embedUrlResponse;
}

const deleteQuicksightDataset = async (datasetArn) => {
  const params = {
      AwsAccountId: my_account_id,
      DataSetId: datasetArn
  };
  return await quicksight.deleteDataSet(params).promise();
}