import { Utils } from "@tago-io/sdk";
import { fetchDeviceList } from "../../lib/fetchDeviceList";
import sendNotificationError from "../../lib/notificationError";
import { RouterConstructorDevice } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: RouterConstructorDevice) => {
  const group_id = (scope[0] as any).device;
  if (!group_id) {
    return;
  }

  const group_info = await account.devices.info(group_id);
  const org_id = group_info.tags.find((x) => x.key === "organization_id").value;
  const org_dev = await Utils.getDevice(account, org_id);

  //delete from settings_device
  await config_dev.deleteData({ groups: group_id, qty: 9999 });
  //delete from org_dev
  await org_dev.deleteData({ groups: group_id, qty: 9999 });

  config_dev.deleteData({ variables: "group_id", values: group_id, qty: 1 });

  //deleting users (site's user)
  const user_accounts = await account.run.listUsers({ filter: { tags: [{ key: "group_id", value: group_id }] } });
  if (user_accounts) {
    user_accounts.forEach(async (user) => {
      await account.run.userDelete(user.id);
      await org_dev.deleteData({ groups: user.id, qty: 9999 }).then((msg) => console.log(msg));
      await config_dev.deleteData({ groups: user.id, qty: 9999 });
    });
  }

  //to comment ~ should not delete the sensors but remove the sensor's group name
  //deleting site's device

  const devices = await fetchDeviceList(account, [{ key: "group_id", value: group_id }]);

  if (devices) {
    devices.forEach(async (x) => {
      account.devices.delete(x.id); /*passing the device id*/
      await org_dev.deleteData({ groups: x.id, qty: 9999 }).then((msg) => msg); //deleting org_dev and config_dev data
      await config_dev.deleteData({ groups: x.id, qty: 9999 });
    });
  }

  return await sendNotificationError(account, environment, `Building ${group_info.name} successfuly deleted!`, "Building deleted");
};
