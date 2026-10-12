import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { Server } from 'http';
import { studioRouter } from '../src/server/studioRoutes.js';
import { paymentRouter } from '../src/server/paymentRoutes.js';

describe('Vault Photographer Studio Authentication & Account Isolation Defense', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/studio', studioRouter);
    app.use('/api', paymentRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('rejects unauthenticated requests to studio endpoints (HTTP 401)', async () => {
    const res = await fetch(`${baseUrl}/api/studio/photo_mwangi_01/dashboard`);
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.ok(data.error.includes('Authentication required'));
  });

  it('returns only authorized memberships for authenticated user', async () => {
    const res = await fetch(`${baseUrl}/api/studio/me/memberships`, {
      headers: {
        'Authorization': 'Bearer usr_kwemoielijah49',
        'x-vault-user-id': 'usr_kwemoielijah49',
        'x-vault-user-email': 'kwemoielijah49@gmail.com',
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.email, 'kwemoielijah49@gmail.com');
    // Elijah is authorized for Mwangi Media and Luxe Flora, but NOT Rift Valley
    const businessIds = data.authorizedPhotographers.map((p: any) => p.id);
    assert.ok(businessIds.includes('photo_mwangi_01'));
    assert.ok(businessIds.includes('photo_amina_02'));
    assert.ok(!businessIds.includes('photo_kip_03'));
  });

  it('allows authorized user to access their own studio dashboard (HTTP 200)', async () => {
    const res = await fetch(`${baseUrl}/api/studio/photo_mwangi_01/dashboard`, {
      headers: {
        'Authorization': 'Bearer usr_kwemoielijah49',
        'x-vault-user-id': 'usr_kwemoielijah49',
        'x-vault-user-email': 'kwemoielijah49@gmail.com',
      },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.photographer.id, 'photo_mwangi_01');
    assert.strictEqual(data.photographer.businessName, 'Mwangi Creative Media');
    assert.ok(Array.isArray(data.events));
    assert.ok(data.metrics !== undefined);
  });

  it('blocks authenticated user from accessing another photographer studio (HTTP 403 Forbidden)', async () => {
    // Elijah tries to access Kiprono's Rift Valley Sports
    const res = await fetch(`${baseUrl}/api/studio/photo_kip_03/dashboard`, {
      headers: {
        'Authorization': 'Bearer usr_kwemoielijah49',
        'x-vault-user-id': 'usr_kwemoielijah49',
        'x-vault-user-email': 'kwemoielijah49@gmail.com',
      },
    });

    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.ok(data.error.includes('Access denied'));
  });

  it('allows owner of single studio to access only their business (HTTP 200 & HTTP 403)', async () => {
    // Josphat can access Rift Valley
    const okRes = await fetch(`${baseUrl}/api/studio/photo_kip_03/dashboard`, {
      headers: {
        'Authorization': 'Bearer usr_josphat_kiprono',
        'x-vault-user-id': 'usr_josphat_kiprono',
        'x-vault-user-email': 'josphat@riftvalleysports.co.ke',
      },
    });
    assert.strictEqual(okRes.status, 200);

    // Josphat cannot access Mwangi Creative Media
    const forbiddenRes = await fetch(`${baseUrl}/api/studio/photo_mwangi_01/dashboard`, {
      headers: {
        'Authorization': 'Bearer usr_josphat_kiprono',
        'x-vault-user-id': 'usr_josphat_kiprono',
        'x-vault-user-email': 'josphat@riftvalleysports.co.ke',
      },
    });
    assert.strictEqual(forbiddenRes.status, 403);
  });

  it('blocks users with revoked membership status from accessing studio (HTTP 403)', async () => {
    // former_agent was revoked in INITIAL_MEMBERSHIPS
    const res = await fetch(`${baseUrl}/api/studio/photo_mwangi_01/dashboard`, {
      headers: {
        'Authorization': 'Bearer usr_former_agent',
        'x-vault-user-id': 'usr_former_agent',
        'x-vault-user-email': 'former_agent@mwangimedia.co.ke',
      },
    });

    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.ok(data.error.includes('Access denied'));
  });

  it('allows studio onboarding / registration and assigns owner role', async () => {
    const newUid = `usr_test_creator_${Date.now()}`;
    const newEmail = `creator_${Date.now()}@example.com`;

    const registerRes = await fetch(`${baseUrl}/api/studio/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newUid}`,
        'x-vault-user-id': newUid,
        'x-vault-user-email': newEmail,
        'x-vault-user-name': 'Test Creator',
      },
      body: JSON.stringify({
        businessName: 'Highland Wildlife Photography',
        bio: 'Documentary wildlife photography in Samburu & Maasai Mara',
        phone: '+254 722 000 111',
        mpesaTillOrPaybill: '992211',
        defaultPriceKes: 300,
      }),
    });

    assert.strictEqual(registerRes.status, 201);
    const registered = await registerRes.json();
    assert.ok(registered.photographer.id);
    assert.strictEqual(registered.membership.role, 'owner');
    assert.strictEqual(registered.membership.status, 'active');

    // Newly registered owner can immediately access their dashboard
    const dashboardRes = await fetch(`${baseUrl}/api/studio/${registered.photographer.id}/dashboard`, {
      headers: {
        'Authorization': `Bearer ${newUid}`,
        'x-vault-user-id': newUid,
        'x-vault-user-email': newEmail,
      },
    });
    assert.strictEqual(dashboardRes.status, 200);
  });

  it('allows owner to invite team member and enforce permissions', async () => {
    const inviteRes = await fetch(`${baseUrl}/api/studio/photo_mwangi_01/team/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer usr_kwemoielijah49',
        'x-vault-user-id': 'usr_kwemoielijah49',
        'x-vault-user-email': 'kwemoielijah49@gmail.com',
      },
      body: JSON.stringify({
        email: 'collaborator@studio.ke',
        name: 'Collaborator Joyce',
        role: 'manager',
      }),
    });

    assert.strictEqual(inviteRes.status, 201);
    const inviteData = await inviteRes.json();
    assert.strictEqual(inviteData.membership.userEmail, 'collaborator@studio.ke');

    // Invited member can now access studio dashboard
    const memberDashboardRes = await fetch(`${baseUrl}/api/studio/photo_mwangi_01/dashboard`, {
      headers: {
        'Authorization': `Bearer ${inviteData.membership.userId}`,
        'x-vault-user-id': inviteData.membership.userId,
        'x-vault-user-email': 'collaborator@studio.ke',
      },
    });
    assert.strictEqual(memberDashboardRes.status, 200);

    // Revoke the membership
    const revokeRes = await fetch(`${baseUrl}/api/studio/photo_mwangi_01/team/${inviteData.membership.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer usr_kwemoielijah49',
        'x-vault-user-id': 'usr_kwemoielijah49',
        'x-vault-user-email': 'kwemoielijah49@gmail.com',
      },
    });
    assert.strictEqual(revokeRes.status, 200);

    // After revocation, access is rejected with 403
    const revokedRes = await fetch(`${baseUrl}/api/studio/photo_mwangi_01/dashboard`, {
      headers: {
        'Authorization': `Bearer ${inviteData.membership.userId}`,
        'x-vault-user-id': inviteData.membership.userId,
        'x-vault-user-email': 'collaborator@studio.ke',
      },
    });
    assert.strictEqual(revokedRes.status, 403);
  });
});
