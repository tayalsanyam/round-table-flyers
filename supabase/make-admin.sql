-- Sign up and confirm your email in the app FIRST.
-- Replace the example email below with your own confirmed signup email.
insert into public.admin_users(user_id)
select id from auth.users where lower(email)=lower('tayalsanyam@gmail.com') and email_confirmed_at is not null
on conflict(user_id) do nothing;
-- Verify that this returns your email. No row means the email is wrong/unconfirmed.
select u.email from public.admin_users a join auth.users u on u.id=a.user_id;
