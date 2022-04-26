import { Bytes, ethers } from "ethers";
import * as client from "../src/client";
import {
  CreateGuildParams,
  CreateRoleParams,
  UpdateGuildParams,
  UpdateRoleParams,
} from "../src/types";

const testWallet = ethers.Wallet.createRandom();
const sign = (signableMessage: string | Bytes) =>
  testWallet.signMessage(signableMessage);

describe("Check client sdk function", () => {
  test("GET /user/membership/:address - interacted with guild", async () => {
    const membership = await client.user.getMemberships(testWallet.address);
    expect(
      membership.some((x) => x.guildId === 1985 && x.roleids.includes(1904))
    ).toBe(true);
  });

  test("GET /user/membership/:address - hasn't interacted with guild", async () => {
    const membership = await client.user.getMemberships(
      "0x0000000000000000000000000000000000000000"
    );
    expect(membership).toStrictEqual([]);
  });

  test("POST /user/join", async () => {
    const joinResponse = await client.guild.join(
      2158,
      testWallet.address,
      sign
    );
    expect(joinResponse.alreadyJoined).toBe(false);
    expect(joinResponse.inviteLink).toMatch(/^https:\/\/discord.gg\/.+$/);
  });

  test("GET /guild", async () => {
    const guilds = await client.guild.getAll();
    expect(guilds.length).toBeGreaterThan(100);

    const ourGuild = guilds.find((x) => x.id === 1985);
    expect(ourGuild.name).toBe("Our Guild");
    expect(ourGuild.urlName).toBe("our-guild");
  });

  test("GET /guild/:address", async () => {
    const guilds = await client.guild.getByAddress("0x0000000000000000000000000000000000000000", "admin");
    expect(guilds).toStrictEqual([]);
  });

  test("GET /guild/:id - ID (number)", async () => {
    const guild = await client.guild.get(1985);
    expect(guild.name).toBe("Our Guild");
    expect(guild.urlName).toBe("our-guild");
  });

  test("GET /guild/:id - urlName", async () => {
    const guild = await client.guild.get("our-guild");
    expect(guild.name).toBe("Our Guild");
    expect(guild.id).toBe(1985);
  });

  test("GET /guild/access/:id/:address", async () => {
    const userAccess = await client.guild.getUserAccess(
      1985,
      testWallet.address
    );
    expect(userAccess.find((x) => x.roleId === 1904)?.access).toBe(true);
    expect(userAccess.find((x) => x.roleId === 1899)?.access).toBe(false);
  });

  test("GET /guild/member/:id/:address", async () => {
    const userAccess = await client.guild.getUserMemberships(
      1985,
      testWallet.address
    );
    expect(userAccess.find((x) => x.roleId === 1904)?.access).toBe(true);
    expect(userAccess.find((x) => x.roleId === 1899)?.access).toBe(false);
  });

  test("guild and role CRUD", async () => {
    // create guild
    const testGuildName = "Test guild";
    const createGuildParams: CreateGuildParams = {
      name: testGuildName,
      imageUrl: "/guildLogos/2.svg",
      description: "Guild created by the SDK's unit test.",
      roles: [
        {
          name: "Test role",
          logic: "AND",
          requirements: [
            {
              type: "ALLOWLIST",
              data: { addresses: [testWallet.address] },
            },
          ],
        },
      ],
    };

    const createGuildReponse = await client.guild.create(
      testWallet.address,
      sign,
      createGuildParams
    );
    expect(createGuildReponse.name).toBe(testGuildName);

    // check if created
    const createdGuild = await client.guild.get(createGuildReponse.id);
    expect(createdGuild.name).toBe(testGuildName);
    expect(createdGuild.roles.length).toBe(1);

    // update guild
    const updatedTestGuildName = "Test guild for SDK";
    const updateGuildParams: UpdateGuildParams = {
      name: updatedTestGuildName,
    };

    const updateGuildResponse = await client.guild.update(
      createGuildReponse.id,
      testWallet.address,
      sign,
      updateGuildParams
    );
    expect(updateGuildResponse.name).toBe(updatedTestGuildName);

    // check if updated
    const updatedGuild = await client.guild.get(updateGuildResponse.id);
    expect(updatedGuild.name).toBe(updatedTestGuildName);

    // create role
    const newRoleName = "New role";
    const createRoleParams: CreateRoleParams = {
      guildId: createGuildReponse.id,
      name: newRoleName,
      logic: "AND",
      requirements: [
        {
          type: "FREE",
        },
      ],
    };
    const createRoleReponse = await client.role.create(
      testWallet.address,
      sign,
      createRoleParams
    );
    expect(createRoleReponse.name).toBe(newRoleName);

    // check if created
    const createdRole = await client.role.get(createRoleReponse.id);
    expect(createdRole.name).toBe(newRoleName);
    expect(createdRole.logic).toBe("AND");

    // update role
    const updatedRoleName = "New role (updated)";
    const updateRoleParams: UpdateRoleParams = {
      name: updatedRoleName,
      logic: "OR",
      requirements: createRoleParams.requirements,
    };

    // check if updated
    const updateRoleResponse = await client.role.update(
      createdRole.id,
      testWallet.address,
      sign,
      updateRoleParams
    );
    expect(updateRoleResponse.name).toBe(updatedRoleName);
    expect(updateRoleResponse.logic).toBe("OR");

    // delete role
    const deleteRoleResponse = await client.role.delete(
      createRoleReponse.id,
      testWallet.address,
      sign
    );
    expect(deleteRoleResponse.success).toBe(true);

    // check if deleted
    const deletedRole = await client.role.get(createRoleReponse.id);
    expect(deletedRole).toBe(null);

    // delete
    const deleteGuildResponse = await client.guild.delete(
      createGuildReponse.id,
      testWallet.address,
      sign
    );
    expect(deleteGuildResponse.success).toBe(true);

    // check if deleted
    const deletedGuild = await client.guild.get(createGuildReponse.id);
    expect(deletedGuild).toBe(null);
  });

  test("GET /guild/:id and GET /role/:id - not exists", async () => {
    const guild = await client.guild.get(9876543287543);
    expect(guild).toBe(null);

    const role = await client.role.get(9876543287543);
    expect(role).toBe(null);
  });
});
