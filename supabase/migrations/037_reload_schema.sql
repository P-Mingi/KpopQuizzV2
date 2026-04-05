-- Force PostgREST to reload schema and pick up create_quiz_bypass function
NOTIFY pgrst, 'reload schema';
