'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Card, Field, FullPageSpinner, PageHeader, Select, TextInput } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import type { Role } from '@/lib/types';
import { useAction } from '@/lib/useAction';
import { useResource } from '@/lib/useResource';
import { emailLooksValid, passwordProblem } from '@/lib/validation';

export default function TeamPage() {
  const { canManageTeam, isAdmin, tenant } = useAuth();

  // Only organization admins may load the list; everyone else gets an empty list and a message.
  const team = useResource('team', () => (canManageTeam ? api.listUsers() : Promise.resolve([])));
  const action = useAction();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!canManageTeam) {
    return (
      <>
        <PageHeader title="Team" />
        <Alert kind="info">
          {tenant?.account_type === 'personal'
            ? 'Personal accounts have one user. Create an organization account to add teammates.'
            : isAdmin
              ? 'Team management is not available for this account.'
              : 'Only admins can manage the team.'}
        </Alert>
      </>
    );
  }

  // Returns the first thing wrong with the form, or null if everything looks fine.
  function findProblem(): string | null {
    if (fullName.trim().length < 2) return 'Please enter the full name.';
    if (!emailLooksValid(email)) return 'Please enter a valid email address.';
    return passwordProblem(password);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const problem = findProblem();
    setFormError(problem);
    if (problem) return;

    const created = await action.run(() =>
      api.createUser({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      }),
    );
    if (created) {
      setNotice(`${created.full_name} was added. Share the password with them safely.`);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('member');
      team.reload();
    }
  }

  const shownError = formError ?? action.error;

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={`People in ${tenant?.name}. Everyone here sees the same documents.`}
      />

      {team.error && (
        <div className="mb-4">
          <Alert kind="error">{team.error}</Alert>
        </div>
      )}
      {!team.data && !team.error && <FullPageSpinner label="Loading the team..." />}

      {team.data && (
        <Card className="mb-6 overflow-x-auto p-0">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-ink-200 text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {team.data.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3 font-medium">{member.full_name}</td>
                  <td className="px-4 py-3">{member.email}</td>
                  <td className="px-4 py-3 capitalize">{member.role}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {member.last_login_at ? formatDateTime(member.last_login_at) : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="max-w-xl">
        <h2 className="font-display text-lg font-bold">Add a team member</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          {notice && <Alert kind="success">{notice}</Alert>}
          {shownError && <Alert kind="error">{shownError}</Alert>}

          <Field label="Full name" htmlFor="member_name">
            <TextInput id="member_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="member_email">
            <TextInput
              id="member_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field
            label="Temporary password"
            htmlFor="member_password"
            hint="At least 8 characters, with a letter and a number."
          >
            <TextInput
              id="member_password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field
            label="Role"
            htmlFor="member_role"
            hint="Admins can edit every document. Members edit their own documents."
          >
            <Select id="member_role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Button type="submit" loading={action.busy}>
            Add member
          </Button>
        </form>
      </Card>
    </>
  );
}