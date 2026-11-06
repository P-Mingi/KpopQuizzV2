create role "postgres.rdkgouofytwfdpbxbzio" login superuser password 'standin-only-local';
create schema auth;
do $$ begin
  for i in 1..700 loop
    execute format('create table public.t%s (id int primary key, v text)', i);
    execute format('insert into public.t%s values (1, %L)', i, 'x');
  end loop;
  for i in 1..20 loop execute format('create table auth.a%s (id int primary key)', i); end loop;
end $$;
