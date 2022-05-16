import { Utils } from "@tago-io/sdk";
import { RouterConstructorData } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: RouterConstructorData) => {
  const user_id = scope[0].group;

  // block the user from deleting himself
  if (environment._user_id === user_id) {
    // await org_dev.sendData(scope);
    throw "User tried to delete himself";
  }

  //checking if user exists
  const user_exists = await account.run.userInfo(user_id);
  if (!user_exists) {
    throw "User does not exist";
  }

  //deleting user
  await account.run.userDelete(user_id).then((msg) => console.log(msg));
  await config_dev.deleteData({ groups: user_id, qty: 9999 });

  //deleting user's information (oragmin/guest)
  const org_id = user_exists.tags.find((x) => ["user_org_id", "organization_id"].includes(x.key))?.value;

  if (!org_id) {
    return;
  }

  const org_dev = await Utils.getDevice(account, org_id);

  const group_id = user_exists.tags.find((x) => x.key === "group_id")?.value;

  if (group_id) {
    const group_dev = await Utils.getDevice(account, group_id);
    await group_dev.deleteData({ groups: user_id, qty: 9999 });
  }
  await org_dev.deleteData({ groups: user_id, qty: 9999 });
  //deleting user
  return;
};
