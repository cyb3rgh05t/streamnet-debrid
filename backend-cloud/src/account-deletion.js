export async function deleteAccountData(client, account) {
  await client.query(
    "delete from tv_device_auth_sessions where account_id = $1",
    [account.id],
  );
  await client.query(
    "delete from app_usage_events where account_id = $1 or lower(email) = $2",
    [account.id, account.email_normalized],
  );
  const deletedAccount = await client.query(
    "delete from accounts where id = $1 returning id",
    [account.id],
  );
  if (!deletedAccount.rows[0])
    throw new Error("Account deletion did not remove the account");
}
