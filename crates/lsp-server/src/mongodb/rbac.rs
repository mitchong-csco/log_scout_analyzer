//! Role-Based Access Control (RBAC) for bundles
//!
//! Provides user roles and permission management for team collaboration.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// User role in the system
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Role {
    /// Full system access - can manage all bundles and users
    Admin,

    /// Can create, edit, and delete own bundles, view shared bundles
    Contributor,

    /// Read-only access to shared bundles
    Viewer,
}

impl Role {
    /// Check if this role can perform an action
    pub fn can(&self, action: Action) -> bool {
        use Action::*;
        use Role::*;

        match (self, action) {
            // Admin can do everything
            (Admin, _) => true,

            // Contributor permissions
            (Contributor, CreateBundle) => true,
            (Contributor, ViewBundle) => true,
            (Contributor, EditOwnBundle) => true,
            (Contributor, DeleteOwnBundle) => true,
            (Contributor, ShareBundle) => true,
            (Contributor, RunAnalysis) => true,

            // Viewer permissions (read-only)
            (Viewer, ViewBundle) => true,
            (Viewer, RunAnalysis) => true, // Can analyze but not modify

            // Everything else denied
            _ => false,
        }
    }
}

/// Actions that can be performed on bundles
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    /// Create a new bundle
    CreateBundle,

    /// View any bundle
    ViewBundle,

    /// Edit own bundles
    EditOwnBundle,

    /// Edit any bundle (admin only)
    EditAnyBundle,

    /// Delete own bundles
    DeleteOwnBundle,

    /// Delete any bundle (admin only)
    DeleteAnyBundle,

    /// Share bundle with team
    ShareBundle,

    /// Run analysis on bundles
    RunAnalysis,

    /// Manage users (admin only)
    ManageUsers,
}

/// User with role and bundle access
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    /// Username
    pub username: String,

    /// User's role
    pub role: Role,

    /// Bundle IDs this user owns
    pub owned_bundles: HashSet<String>,

    /// Bundle IDs shared with this user
    pub shared_bundles: HashSet<String>,
}

impl User {
    /// Create a new user
    pub fn new(username: String, role: Role) -> Self {
        Self {
            username,
            role,
            owned_bundles: HashSet::new(),
            shared_bundles: HashSet::new(),
        }
    }

    /// Check if user can perform action
    pub fn can(&self, action: Action) -> bool {
        self.role.can(action)
    }

    /// Check if user can access a bundle
    pub fn can_access_bundle(&self, bundle_id: &str) -> bool {
        // Admins can access everything
        if self.role == Role::Admin {
            return true;
        }

        // Check ownership or shared access
        self.owned_bundles.contains(bundle_id) || self.shared_bundles.contains(bundle_id)
    }

    /// Check if user owns a bundle
    pub fn owns_bundle(&self, bundle_id: &str) -> bool {
        self.owned_bundles.contains(bundle_id)
    }

    /// Grant access to a bundle
    pub fn grant_access(&mut self, bundle_id: String) {
        self.shared_bundles.insert(bundle_id);
    }

    /// Revoke access to a bundle
    pub fn revoke_access(&mut self, bundle_id: &str) {
        self.shared_bundles.remove(bundle_id);
    }

    /// Add bundle ownership
    pub fn add_owned_bundle(&mut self, bundle_id: String) {
        self.owned_bundles.insert(bundle_id);
    }
}

/// Access control list for a bundle
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleACL {
    /// Bundle ID
    pub bundle_id: String,

    /// Owner username
    pub owner: String,

    /// Usernames with access
    pub shared_with: HashSet<String>,

    /// Whether bundle is public (visible to all)
    pub is_public: bool,
}

impl BundleACL {
    /// Create a new ACL for a bundle
    pub fn new(bundle_id: String, owner: String) -> Self {
        Self {
            bundle_id,
            owner,
            shared_with: HashSet::new(),
            is_public: false,
        }
    }

    /// Check if user can access this bundle
    pub fn can_access(&self, username: &str, role: Role) -> bool {
        // Admins can access everything
        if role == Role::Admin {
            return true;
        }

        // Owner can access
        if self.owner == username {
            return true;
        }

        // Public bundles accessible by all
        if self.is_public {
            return true;
        }

        // Check if explicitly shared
        self.shared_with.contains(username)
    }

    /// Check if user can edit this bundle
    pub fn can_edit(&self, username: &str, role: Role) -> bool {
        // Admins can edit everything
        if role == Role::Admin {
            return true;
        }

        // Only owner can edit (unless admin)
        self.owner == username
    }

    /// Share bundle with user
    pub fn share_with(&mut self, username: String) {
        self.shared_with.insert(username);
    }

    /// Unshare bundle from user
    pub fn unshare_with(&mut self, username: &str) {
        self.shared_with.remove(username);
    }

    /// Make bundle public
    pub fn make_public(&mut self) {
        self.is_public = true;
    }

    /// Make bundle private
    pub fn make_private(&mut self) {
        self.is_public = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_permissions_admin() {
        let admin = Role::Admin;

        // Admin can do everything
        assert!(admin.can(Action::CreateBundle));
        assert!(admin.can(Action::ViewBundle));
        assert!(admin.can(Action::EditAnyBundle));
        assert!(admin.can(Action::DeleteAnyBundle));
        assert!(admin.can(Action::ManageUsers));
    }

    #[test]
    fn test_role_permissions_contributor() {
        let contributor = Role::Contributor;

        // Contributor can create and edit own
        assert!(contributor.can(Action::CreateBundle));
        assert!(contributor.can(Action::ViewBundle));
        assert!(contributor.can(Action::EditOwnBundle));
        assert!(contributor.can(Action::DeleteOwnBundle));
        assert!(contributor.can(Action::RunAnalysis));

        // But not manage others or users
        assert!(!contributor.can(Action::EditAnyBundle));
        assert!(!contributor.can(Action::DeleteAnyBundle));
        assert!(!contributor.can(Action::ManageUsers));
    }

    #[test]
    fn test_role_permissions_viewer() {
        let viewer = Role::Viewer;

        // Viewer can only view and analyze
        assert!(viewer.can(Action::ViewBundle));
        assert!(viewer.can(Action::RunAnalysis));

        // Cannot create or edit
        assert!(!viewer.can(Action::CreateBundle));
        assert!(!viewer.can(Action::EditOwnBundle));
        assert!(!viewer.can(Action::DeleteOwnBundle));
    }

    #[test]
    fn test_user_bundle_access() {
        let mut user = User::new("alice".to_string(), Role::Contributor);

        // No access initially
        assert!(!user.can_access_bundle("bundle_1"));

        // Add owned bundle
        user.add_owned_bundle("bundle_1".to_string());
        assert!(user.can_access_bundle("bundle_1"));
        assert!(user.owns_bundle("bundle_1"));

        // Grant access to shared bundle
        user.grant_access("bundle_2".to_string());
        assert!(user.can_access_bundle("bundle_2"));
        assert!(!user.owns_bundle("bundle_2"));

        // Revoke access
        user.revoke_access("bundle_2");
        assert!(!user.can_access_bundle("bundle_2"));
    }

    #[test]
    fn test_bundle_acl_owner() {
        let acl = BundleACL::new("bundle_1".to_string(), "alice".to_string());

        // Owner can access and edit
        assert!(acl.can_access("alice", Role::Contributor));
        assert!(acl.can_edit("alice", Role::Contributor));

        // Others cannot
        assert!(!acl.can_access("bob", Role::Contributor));
        assert!(!acl.can_edit("bob", Role::Contributor));
    }

    #[test]
    fn test_bundle_acl_admin() {
        let acl = BundleACL::new("bundle_1".to_string(), "alice".to_string());

        // Admin can access and edit everything
        assert!(acl.can_access("admin", Role::Admin));
        assert!(acl.can_edit("admin", Role::Admin));
    }

    #[test]
    fn test_bundle_acl_sharing() {
        let mut acl = BundleACL::new("bundle_1".to_string(), "alice".to_string());

        // Share with bob
        acl.share_with("bob".to_string());
        assert!(acl.can_access("bob", Role::Viewer));

        // Bob can access but not edit
        assert!(!acl.can_edit("bob", Role::Contributor));

        // Unshare
        acl.unshare_with("bob");
        assert!(!acl.can_access("bob", Role::Viewer));
    }

    #[test]
    fn test_bundle_acl_public() {
        let mut acl = BundleACL::new("bundle_1".to_string(), "alice".to_string());

        // Not public initially
        assert!(!acl.can_access("anyone", Role::Viewer));

        // Make public
        acl.make_public();
        assert!(acl.can_access("anyone", Role::Viewer));

        // Still only owner can edit
        assert!(!acl.can_edit("anyone", Role::Contributor));
        assert!(acl.can_edit("alice", Role::Contributor));

        // Make private again
        acl.make_private();
        assert!(!acl.can_access("anyone", Role::Viewer));
    }
}
