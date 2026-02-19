//! RBAC module for team member and permission management
//!
//! Defines roles (Admin, Editor, Viewer) and permissions

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// User roles with hierarchical permissions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Role {
    /// Full access to all operations including team management
    Admin,
    /// Can create, edit, view, and share bundles
    Editor,
    /// Read-only access to bundles
    Viewer,
}

/// Available permissions in the system
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Permission {
    CreateBundle,
    EditBundle,
    DeleteBundle,
    ViewBundle,
    ShareBundle,
    ManageTeam,
}

/// Team member with role and audit trail
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamMember {
    pub user_id: String,
    pub role: Role,
    pub added_at: DateTime<Utc>,
    pub added_by: String,
}

/// RBAC manager for permission checking
pub struct RbacManager;

impl RbacManager {
    /// Check if user has specific permission based on role
    pub fn has_permission(role: &Role, permission: &Permission) -> bool {
        match role {
            Role::Admin => true, // Admin has all permissions
            Role::Editor => matches!(
                permission,
                Permission::CreateBundle
                    | Permission::EditBundle
                    | Permission::ViewBundle
                    | Permission::ShareBundle
            ),
            Role::Viewer => matches!(permission, Permission::ViewBundle),
        }
    }

    /// Get all permissions for a role
    pub fn get_permissions(role: &Role) -> Vec<Permission> {
        match role {
            Role::Admin => vec![
                Permission::CreateBundle,
                Permission::EditBundle,
                Permission::DeleteBundle,
                Permission::ViewBundle,
                Permission::ShareBundle,
                Permission::ManageTeam,
            ],
            Role::Editor => vec![
                Permission::CreateBundle,
                Permission::EditBundle,
                Permission::ViewBundle,
                Permission::ShareBundle,
            ],
            Role::Viewer => vec![Permission::ViewBundle],
        }
    }

    /// Check if role can perform action on bundle
    pub fn can_access_bundle(role: &Role, bundle_owner: &str, user_id: &str) -> bool {
        match role {
            Role::Admin => true,
            Role::Editor | Role::Viewer => bundle_owner == user_id,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_admin_permissions() {
        assert!(RbacManager::has_permission(
            &Role::Admin,
            &Permission::DeleteBundle
        ));
        assert!(RbacManager::has_permission(
            &Role::Admin,
            &Permission::ManageTeam
        ));
        assert!(RbacManager::has_permission(
            &Role::Admin,
            &Permission::CreateBundle
        ));
    }

    #[test]
    fn test_editor_permissions() {
        assert!(RbacManager::has_permission(
            &Role::Editor,
            &Permission::CreateBundle
        ));
        assert!(RbacManager::has_permission(
            &Role::Editor,
            &Permission::EditBundle
        ));
        assert!(!RbacManager::has_permission(
            &Role::Editor,
            &Permission::DeleteBundle
        ));
        assert!(!RbacManager::has_permission(
            &Role::Editor,
            &Permission::ManageTeam
        ));
    }

    #[test]
    fn test_viewer_permissions() {
        assert!(RbacManager::has_permission(
            &Role::Viewer,
            &Permission::ViewBundle
        ));
        assert!(!RbacManager::has_permission(
            &Role::Viewer,
            &Permission::CreateBundle
        ));
        assert!(!RbacManager::has_permission(
            &Role::Viewer,
            &Permission::EditBundle
        ));
    }

    #[test]
    fn test_get_permissions() {
        assert_eq!(RbacManager::get_permissions(&Role::Admin).len(), 6);
        assert_eq!(RbacManager::get_permissions(&Role::Editor).len(), 4);
        assert_eq!(RbacManager::get_permissions(&Role::Viewer).len(), 1);
    }
}
