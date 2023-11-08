/*
 * KickStarter Analysis
 * Handler
 *
 * This analysis handles most of buttons clickable by dashboard input form widgets such as dynamic table and input form widgets.
 *
 * Handles the following actions:
 * - Add, edit and delete an Organization.
 * - Add, edit and delete a Group.
 * - Add, edit and delete a Sensor.
 * - Add, edit and delete a User.
 * - Add, edit and delete scheduled reports.
 *
 * How to setup this analysis
 * Make sure you have the following enviroment variables:
 * - config_token: the value must be a token from a HTTPs device, that stores general information of the application.
 * - account_token: the value must be a token from your profile. generated at My Settings of your developer's account.
 */

import { Account, Analysis, Device, Utils } from "@tago-io/sdk";
import { Data, TagoContext } from "@tago-io/sdk/lib/types";

import sensorEdit from "../services/device/edit";
import sensorAdd from "../services/device/register";
import sensorDel from "../services/device/remove";
import groupEdit from "../services/group/edit";
import groupAdd from "../services/group/register";
import groupDel from "../services/group/remove";
import orgEdit from "../services/organization/edit";
import orgAdd from "../services/organization/register";
import orgDel from "../services/organization/remove";
import subgroupEdit from "../services/subgroup/edit";
import subgroupAdd from "../services/subgroup/register";
import subgroupDel from "../services/subgroup/remove";
import userEdit from "../services/user/edit";
import userAdd from "../services/user/register";
import userDel from "../services/user/remove";

// import { createAlert } from "../services/alerts/register";
// import { deleteAlert } from "../services/alerts/remove";
// import { editAlert } from "../services/alerts/edit";

/**
 *
 * @param context
 * @param scope
 * @returns
 */
async function startAnalysis(context: TagoContext, scope: Data[]): Promise<void> {
  console.log("SCOPE:", JSON.stringify(scope, null, 4));
  console.log("CONTEXT:", JSON.stringify(context, null, 4));
  console.log("Running Analysis");

  // Convert the environment variables from [{ key, value }] to { key: value };
  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  }

  if (!environment.config_token) {
    throw "Missing config_token environment var";
  } else if (!environment.account_token) {
    throw "Missing account_token environment var";
  }

  // Just a little hack to set the device_list_button_id that come sfrom the scope
  // and set it to the environment variables instead. It makes easier to use router function later.
  environment._input_id = (scope as any).find((x: any) => x.device_list_button_id)?.device_list_button_id;

  const config_dev = new Device({ token: environment.config_token });
  const account = new Account({ token: environment.account_token });

  // The router class will help you route the function the analysis must run
  // based on what had been received in the analysis.
  const router = new Utils.AnalysisRouter({ scope, context, environment, account, config_dev });

  // Organization Routing
  router.register(orgAdd).whenInputFormID("create-org");
  router.register(orgDel).whenEnv("_input_id", "delete-org");
  router.register(orgEdit as any).whenWidgetExec("edit-org" as any);

  // Sensor routing
  router.register(sensorAdd).whenInputFormID("create-dev");
  router.register(sensorDel as any).whenEnv("_input_id", "delete-dev");
  router.register(sensorEdit as any).whenWidgetExec("edit-dev" as any);

  // group routing
  router.register(groupAdd).whenInputFormID("create-group");
  router.register(groupDel as any).whenEnv("_input_id", "delete-group");
  router.register(groupEdit as any).whenWidgetExec("edit-group" as any);

  // subgroup routing
  router.register(subgroupAdd).whenInputFormID("create-subgroup");
  router.register(subgroupDel as any).whenEnv("_input_id", "delete-subgroup");
  router.register(subgroupEdit as any).whenWidgetExec("edit-subgroup" as any);

  // User routing
  router.register(userAdd).whenInputFormID("create-user");
  router.register(userDel).whenVariableLike("user_").whenWidgetExec("delete");
  router.register(userEdit).whenVariableLike("user_").whenWidgetExec("edit");

  // //Alert routing
  // router.register(createAlert).whenInputFormID("create-alert");
  // router.register(editAlert).whenVariableLike("action_").whenWidgetExec("edit");
  // router.register(deleteAlert).whenVariableLike("action_").whenWidgetExec("delete");

  await router.exec();
}

export { startAnalysis };
export default new Analysis(startAnalysis, { token: "cb804c14-4851-4d43-9075-4bde620a4856" });
