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
    return result.id;
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
   * @param ccAccountId target account id
   * @param ruleId target rule id
   * @param notes optional parameter to get notes for the specified rule setting
   */
  public async getRuleSetting(ccAccountId: string, ruleId: string, notes?: boolean){
    return await this.ccRequest("GET", "accounts/" + ccAccountId + "settings/rules/" + ruleId);
  };

  public async deleteAccount(ccAccountId: string) {
    return await this.ccRequest("DELETE", "accounts/" + ccAccountId);
  };

  public async getOrganizationCloudConformityExternalId(): Promise<string> {
    const result = await this.ccRequest("GET", "organisation/external-id");
    return result.id;
  };


  // Template Scanner API

  public async scanACloudFormationTemplate(template: string, type?: string, profileId?: string, accountId?: string) {
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
    return (await this.ccRequest("POST", "template-scanner/scan", data));
  }

  public async scanACloudFormationTemplateAndReturAsArrays(template: string, type?: string, profileId?: string, accountId?: string): Promise<{success: [any], failure: [any]}>{
    const data = await this.scanACloudFormationTemplate(template, type, profileId, accountId);
    const success = data.filter((entry: any) => entry.attributes.status === "SUCCESS");
    const failure = data.filter((entry: any) => entry.attributes.status === "FAILURE");
    return {
      "success": success,
      "failure": failure
    };
  }

  // Users API

  public async getAllUsers() {
    return await this.ccRequest("GET", "/users");
  };

  public async getTheCurrentUser() {
    return await this.ccRequest("GET", "/users/whoami");
  };

  public async getTheCurrentUserEmail(){
    const user = await this.getTheCurrentUser();
    return user.attributes.email;
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
  
  // Profiles API

  /**
   * Displays a list of profiles associated to an organisation.
   */
  public async listAllProfiles(){
    return await this.ccRequest("GET", "profiles");
  }

  /**
   * Allows you to get the details of the specified profile.
   * @param profile The Cloud Conformity ID of the profile
   */
  public async getProfileAndRuleSettings(profile: string){
    return await this.ccRequest("GET", "profiles/" + profile);
  };

  /**
   * Save a new profile and a batch of configured rule settings upon profile creation
   * @param profile a JSON object following the Profile GUI standard.
   */
  public async saveNewProfileAndRuleSettings(profile: any){
    return await this.ccRequest("POST", "profiles", this.profileJsonToDataParameter(profile));
  }

  /**
   * Converts a profile to the expected POST parameter. 
   * @param profile a JSON object following the Profile GUI standard.
   */
  private profileJsonToDataParameter(profile: any){
    let dataArray: { type: string; id: any; }[] = [];
    let includedArray: { type: string; id: any; attributes: { extraSettings: any; enabled: any; exceptions: any; riskLevel: any; }; }[] = [];
    profile.ruleSettings.map((rule: { id: any; enabled: any; exceptions: any; riskLevel: any; extraSettings?: any; }) => {
      dataArray.push({
        type: "rules",
        id: rule.id
      });
      includedArray.push({
        type: "rules",
        id: rule.id,
        attributes: {
          enabled: rule.enabled,
          exceptions: rule.exceptions,
          riskLevel: rule.riskLevel,
          ...(rule.extraSettings && {extraSettings: rule.extraSettings})
        },
      });
    });
    return {
      included: includedArray,
      data: {
        type: "profiles",
        attributes: {
          name: profile.name,
          description: profile.description
        },
        relationships: {
          ruleSettings: {
            "data": dataArray
          }
        }
      }
    };
  }

  /**
   * Allows you to delete a specified profile and all affiliated rule settings.
   * @param profileId The Cloud Conformity ID of the profile
   */
  public async deleteProfileAndRuleSettings(profileId: string){
    return await this.ccRequest("DELETE", "profiles/" + profileId);
  }

  /**
   * Allows you to apply profile and rule settings to a set of accounts under your organisation.
   * @param profileId The Cloud Conformity ID of the profile
   * @param mode Mode of how the profile will be applied to the accounts, i.e. "fill-gaps", "overwrite" or "replace".
   * @param notes Log notes. This field is expected to be filled out, ideally with a reason for the profile being applied.
   * @param accountIds An Array of account Id's that will be configured by the profile.
   */
  public async applyProfileToAccounts(profileId: string, mode: string, notes: string, accountIds: string[]){
    const data = {
      meta: {
        accountIds: accountIds,
        types: ["rule"],
        mode: mode,
        notes: notes,
      }
    };
    return await this.ccRequest("POST", "profiles/" + profileId, data);
  }

  // // Checks API

  public async listAllChecks(): Promise<string> {
    return await this.ccRequest("GET", "checks")
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
    return axiosOutput.data.data;
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
