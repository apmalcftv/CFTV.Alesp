-- ============================================================
-- Sprint de Refinamento — IP é o identificador de origem da câmera
-- (o número da câmera passa a ser derivado do último octeto do IP
-- na própria aplicação); garante que dois cadastros não usem o
-- mesmo IP dentro do mesmo tenant.
-- ============================================================

alter table cameras
  add constraint cameras_tenant_ip_unico unique (tenant_id, ip);
