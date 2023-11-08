import { Account, Device, Types, Utils } from "@tago-io/sdk";
import { DeviceCreateInfo, DeviceListItem } from "@tago-io/sdk/lib/types";

import { parseTagoObject } from "../../lib/data.logic";
import { fetchDeviceList } from "../../lib/fetchDeviceList";
import { findDashboardByConnectorID, findDashboardByExportID } from "../../lib/findResource";
import validation from "../../lib/validation";
import { DeviceCreated, RouterConstructorData } from "../../types";

interface installDeviceParam {
  account: Account; //script
  new_dev_name: string;
  org_id: string; //script
  network_id: string;
  connector: string;
  new_device_eui: string;
  type: string;
  group_id: string; //script
  subgroup_id?: string;
}

async function installDevice({ account, new_dev_name, org_id, network_id, connector, new_device_eui, type, subgroup_id, group_id }: installDeviceParam) {
  const device_data: DeviceCreateInfo = {
    name: new_dev_name,
    network: network_id,
    serie_number: new_device_eui,
    connector,
    type: "immutable",
    chunk_period: "month",
    chunk_retention: 1,
  };

  //creating new device
  const new_dev = await account.devices.create(device_data);

  const new_tags = {
    tags: [
      { key: "device_id", value: new_dev.device_id },
      { key: "organization_id", value: org_id },
      { key: "device_type", value: "device" },
      { key: "sensor", value: type },
      { key: "group_id", value: group_id },
      { key: "subgroup_id", value: subgroup_id || "N/A" },
    ],
  };

  await account.devices.edit(new_dev.device_id, new_tags);

  const new_org_dev = new Device({ token: new_dev.token });

  return { ...new_dev, device: new_org_dev } as DeviceCreated;
}

export default async ({ config_dev, context, scope, account, environment }: RouterConstructorData) => {
  const subgroup_id = scope[0].device as string;
  const subgroup_dev = await Utils.getDevice(account, subgroup_id);
  const { tags: subgroup_tags } = await subgroup_dev.info();
  const org_id = subgroup_tags.find((tag) => tag.key === "organization_id").value;
  const group_id = subgroup_tags.find((tag) => tag.key === "group_id").value;

  const validate = validation("dev_validation", subgroup_dev);
  validate("#VAL.REGISTERING#", "warning");

  //Collecting data
  const new_dev_name = scope.find((x) => x.variable === "new_dev_name");
  const new_dev_eui = scope.find((x) => x.variable === "new_dev_eui");
  const new_dev_type = scope.find((x) => x.variable === "new_dev_type");
  const new_dev_network = scope.find((x) => x.variable === "new_dev_network");

  if ((new_dev_name?.value as string).length < 3) {
    throw validate("#VAL.NAME_FIELD_IS_SMALLER_THAN_3_CHAR#", "danger");
  }

  if (!new_dev_type?.value) {
    throw validate("#VAL.DEVICE_TYPE_NOT_FOUND_PLEASE_SELECT_AGAIN_THE_DEVICE_TYPE#", "danger");
  }

  //If choosing for the simulator, we generate a random EUI
  const dev_eui = (new_dev_eui?.value as string)?.toUpperCase();

  const dev_exists: DeviceListItem[] = await fetchDeviceList(account, [], dev_eui);

  if (dev_exists.length > 0) {
    throw validate("#VAL.DEVICE_ALREADY_EXISTS#", "danger");
  }

  const connector_id = new_dev_type.value as string;

  let dash_id = "";
  try {
    ({ id: dash_id } = await findDashboardByConnectorID(account, connector_id));
  } catch (error) {
    return validate("#VAL.ERROR__NO_DASHBOARD_FOUND#", "danger");
  }

  const dash_info = await account.dashboards.info(dash_id);
  const type = dash_info.blueprint_devices.find((bp) => bp.conditions[0].key === "sensor");
  if (!type) {
    return validate("#VAL.ERROR__DASHBOARD_IS_MISSING_THE_BLUEPRINT_DEVICE_SENSOR#", "danger");
  }

  const { device_id, device } = await installDevice({
    account,
    new_dev_name: new_dev_name.value as string,
    org_id,
    network_id: new_dev_network.value as string,
    connector: connector_id,
    new_device_eui: dev_eui,
    type: type.conditions[0].value,
    subgroup_id,
    group_id,
  });

  const dev_data = parseTagoObject(
    {
      dev_id: {
        value: device_id,
        metadata: {
          label: new_dev_name.value,
          url: `https://admin.tago.io/dashboards/info/${dash_info.id}?org_dev=${org_id}&sensor=${device_id}`,
          status: "unknwon",
          type: dash_info.type,
        },
      },
    },
    device_id
  );

  await account.devices.paramSet(device_id, {
    key: "dashboard_url",
    value: `https://admin.tago.io/dashboards/info/${dash_info.id}?org_dev=${org_id}&group_dev=${group_id}&sensor=${device_id}`,
    sent: false,
  });

  await account.devices.paramSet(device_id, { key: "dev_eui", value: dev_eui, sent: false });
  await account.devices.paramSet(device_id, { key: "dev_lastcheckin", value: "-", sent: false });
  await account.devices.paramSet(device_id, { key: "dev_battery", value: "-", sent: false });

  // await config_dev.sendData(dev_data);

  // const add_to_dropdown_list = parseTagoObject({ asset_list: new_dev_name.value }, device_id);
  // await org_dev.sendData(dev_data.concat(add_to_dropdown_list));

  await subgroup_dev.sendData(dev_data);

  //0109611395

  return validate("#VAL.DEVICE_CREATED_SUCCESSFULLY#", "success");
};

//Axioma Water Meter Qalcosonic W1  PAYLOAD EXAMPLE

// [
//   {
//     "variable": "payload",
//     "value": "5d35a00e30293500005D34B630e7290000b800b900b800b800b800b900b800b800b800b800b800b800b900b900b9009"
//   },
//     {
//     "variable": "port",
//     "value": 100
//   }
// ]
