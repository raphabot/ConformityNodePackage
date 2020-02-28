import axios, { AxiosResponse, AxiosRequestConfig } from "axios";

export class CloudConformity {
  endpoint: string;
  apikey: string;
  url: string;

  constructor(endpoint: string, apikey: string) {
    this.endpoint = endpoint;
    this.url = "https://" + endpoint + "-api.cloudconformity.com/v1/"
    this.apikey = apikey;
  };

  // Accounts API
  
  public async createAnAccount(name: string, environment: string, roleArn: string, externalId: string, costPackage: boolean, hasRealTimeMonitoring: boolean){
    const data = {
      "data": {
        "type": "account",
        "attributes": {
          "name": name,
          "environment": environment,
          "access": {
            "keys": {
              "roleArn": roleArn,
              "externalId": externalId
            }
          },
          "costPackage": costPackage,
          "hasRealTimeMonitoring": hasRealTimeMonitoring
        }
      }
    }
    console.log(JSON.stringify(data, null, 2));
    const result = await this.ccRequest("POST", "accounts", data);
    return result.data.id;
  }

  public async listAllAccounts(){
    return await this.ccRequest("GET", "accounts");
  };

  public async getAccountDetails(id: string){
    return await this.ccRequest("GET", "accounts/" + id);
  };

  public async getAccountAccessSetting(id: string){
    return await this.ccRequest("GET", "accounts/" + id + "/access");
  };

  public async scanAccount(ccAccountId: string){
    return await this.ccRequest("POST", "accounts/" + ccAccountId + "/scan");
  };

  public async updateAccountSubscription(ccAccountId: string, costPackage: boolean, hasRealTimeMonitoring: boolean){
    const data = {
      "data": {
        "attributes": {
          "costPackage": costPackage,
          "hasRealTimeMonitoring": hasRealTimeMonitoring
        }
      }
    }
    return await this.ccRequest("PATCH", "accounts/" + ccAccountId + "/subscription", data);
  };

  public async updateAccount(ccAccountId: string, name: string, environment: string, code: string, tags: [string]){
    const data = {
      "data": {
        "attributes": {
          "name": name,
          "environment": environment,
          "code": code,
          "tags": tags
        }
      }
    }
    return await this.ccRequest("PATCH", "accounts/" + ccAccountId, data);
  };

  /**
   * @TODO: Implement notes
   */
  public async getRuleSetting(ccAccountId: string, ruleId: string, notes?: boolean){
    return await this.ccRequest("GET", "accounts/" + ccAccountId + "/settings/rules/" + ruleId);
  };

  public async deleteAccount(ccAccountId: string) {
    return await this.ccRequest("DELETE", "accounts/" + ccAccountId);
  };

  public async getOrganizationCloudConformityExternalId(): Promise<string> {
    const result = await this.ccRequest("GET", "organisation/external-id");
    return result.data.id;
  };


  // Template Scanner API

  public async scanACloudFormationTemplate(template:string, type?: string, profileId?: string, accountId?: string) {
    const data = {
      "data": {
        "attributes": {
          "type": type? type : "cloudformation-template",
          ...profileId && { "profileId" : profileId },
          ...accountId && { "accountId" : accountId },
          "contents": template
        }
      }
    };
    return await this.ccRequest("POST", "template-scanner/scan", data)
  }

  // Users API

  public async getTheCurrentUser() {
    return await this.ccRequest("GET", "/users/whoami");
  };

  public async getTheCurrentUserEmail(){
    const user = await this.getTheCurrentUser();
    console.log(user);
    return user.data.attributes.email;
  }

  public async getUserDetails(userId: string) {
    return await this.ccRequest("GET", "/users/" + userId);
  };

  public async updateAUsersRoleAndAccountAccessLevel(userId: string, role: string, accessList?: [object]){
    const data = {
      "data": {
        "role": role,
        ...accessList && { "accessList": accessList }
      }
    }
    return await this.ccRequest("PATCH", "/users/" + userId, data);
  };

  public async revokeUser(userId: string) {
    return await this.ccRequest("DELETE", "/users/" + userId);
  };

  // Settings API

  public async createCommunicationSettings(channel: string, enabled: boolean, manual?: boolean, filter?: object, configuration?: object, accountId?: string ){
    const data = {
      "data": {
        "type": "settings",
        "attributes": {
          "type": "communication",
          "channel": channel,
          "enabled": enabled,
          ...manual && { "manual" : manual},
          ...filter && { "filter" : filter},
          ...configuration && { "configuration" : configuration}
        },
        "relationships": {
          "account": {
            "data": accountId? {
              "type": "accounts",
              "accountId": accountId
            } : null
          }
        }
      }
    }
    return await this.ccRequest("POST", "/settings/communication", data);
  };

  public async getCommunicationSettings() {
    return await this.ccRequest("GET", "/settings/communication");
  }

  public async getCommunicationSettingDetails(communicationId: string){
    return await this.ccRequest("GET", "/settings/" + communicationId);
  };

  public async updateCommunicationSetting(communicationId: string, channel: string, enabled: boolean, serviceName: string, serviceKey: string){
    const data = {
      "data": {
        "type": "settings",
        "attributes": {
          "type": "communication",
          "channel": channel,
          "enabled": enabled,
          "configuration": {
            "serviceName": serviceName,
            "serviceKey": serviceKey
          }
        }
      }
    };
    return await this.ccRequest("PATCH", "/settings/communication/" + communicationId, data);
  };

  public async deleteCommunicationSetting(communicationId: string){
    return await this.ccRequest("DELETE", "/settings/" + communicationId);
  };


  // Private helper functions

  /**
   * Sends a HTTP request to Cloud Conformity endpoint.
   * @param method HTTP Method
   * @param path path to be appended to CC endpoint
   * @param data Optional parameter with json data to be submitted with the request.
   */
  private async ccRequest (method: AxiosRequestConfig["method"], path: string, data?: object): Promise<any>{
    try {
      return this.parseAxiosOutput(await axios(this.generateRequest(method, path, data? data : undefined)));
    } catch (error) {
      return await this.parseAxiosError(error);
    }
  };
  
  private generateRequest = (method: AxiosRequestConfig["method"], path: string, data?: object): AxiosRequestConfig => {
    return {
      baseURL: this.url,
      url: path,
      method: method,
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Authorization': 'ApiKey ' + this.apikey
      },
      responseType: 'json',
      ...data && {data : data}
    };
  };

  private parseAxiosOutput = (axiosOutput: any): object => {
    return axiosOutput.data;
  };

  private async parseAxiosError (error: AxiosResponse["request"]): Promise<object> {
    // Error 😨
    if (error.response) {
      /*
      * The request was made and the server responded with a
      * status code that falls out of the range of 2xx
      */
      return error.response.data;
    } else if (error.request) {
      /*
      * The request was made but no response was received, `error.request`
      * is an instance of XMLHttpRequest in the browser and an instance
      * of http.ClientRequest in Node.js
      */
      return error.request;
    } else {
      // Something happened in setting up the request and triggered an Error
      return error.message;
    }
  };
}