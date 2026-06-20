import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolePermissionService } from './role-permission.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  providers: [
    RolePermissionService,
    PermissionsGuard,
    RolesGuard,
    Reflector,
  ],
  exports: [
    RolePermissionService,
    PermissionsGuard,
    RolesGuard,
  ],
})
export class RolePermissionModule {}
