const { data: conversation } =
  await supabase
    .from('conversations')
    .insert([
      {
        name: groupName,
        is_group: true,
      },
    ])
    .select()
    .single();