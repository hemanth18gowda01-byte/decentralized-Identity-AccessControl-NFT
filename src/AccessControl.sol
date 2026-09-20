//SPDX-License-Identifier:MIT
pragma solidity ^0.8.18;

contract AccessControl {

    address public OWNER;

    enum Role{
        NONE,
        ADMIN,
        MANAGER,
        AUDITOR,
        EMPLOYEE
    }
    enum Permission{
        NONE,
        CREATE_ASSET,
        ALLOCATE_ASSET,
        TRANSFER_ASSET,
        VIEW_ASSET,
        AUDIT,
        MANAGE_EMPLOYEES
    }


    mapping(address=>Role) public role;
    mapping(address => mapping(Permission => bool)) internal permissions;

    constructor(){
        OWNER = msg.sender;
        role[msg.sender] = Role.ADMIN;
        permissions[msg.sender][Permission.CREATE_ASSET] = true;
        permissions[msg.sender][Permission.ALLOCATE_ASSET] = true;
        permissions[msg.sender][Permission.TRANSFER_ASSET] = true;
        permissions[msg.sender][Permission.VIEW_ASSET] = true;
        permissions[msg.sender][Permission.AUDIT] = true;
        permissions[msg.sender][Permission.MANAGE_EMPLOYEES] = true;
    }

    modifier onlyAdmin() {
        require(msg.sender==OWNER,"You are not Admin");
        _;
    }

    function transferOwnership(address newOwner) external onlyAdmin {
        require(newOwner != address(0), "Enter a valid owner");
        address previousOwner = OWNER;
        OWNER = newOwner;
        role[newOwner] = Role.ADMIN;
        permissions[newOwner][Permission.CREATE_ASSET] = true;
        permissions[newOwner][Permission.ALLOCATE_ASSET] = true;
        permissions[newOwner][Permission.TRANSFER_ASSET] = true;
        permissions[newOwner][Permission.VIEW_ASSET] = true;
        permissions[newOwner][Permission.AUDIT] = true;
        permissions[newOwner][Permission.MANAGE_EMPLOYEES] = true;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    event RoleAssigned(
        address indexed wallet,
        Role role,
        address whoUpdatedThis,
        uint256 timestamp
    );
    event RoleRemoved(
        address indexed wallet,
        Role role,
        Permission permission,
        address whoUpdatedThis,
        uint256 timestamp
    );
    event PermissionGranted(
        address indexed wallet,
        Role role,
        Permission permission,
        address whoUpdatedThis,
        uint256 timestamp
    );
    event PermissionRevoked(
        address indexed wallet,
        Role role,
        Permission permission,
        address whoUpdatedThis,
        uint256 timestamp
    );

    function assignRole(address _address,Role _role) external {
        require(_address!=address(0),"Enter a valid address");
        require(msg.sender==OWNER || role[msg.sender]==Role.ADMIN || role[msg.sender]==Role.MANAGER,"You are not authorized to assign roles");
        require(_role!=Role.NONE,"Enter a valid role");
        role[_address]=_role;
        emit RoleAssigned(_address,_role,msg.sender,block.timestamp);
    }

    function removeRole(address _address) external {
        require(_address!=address(0),"Enter a valid address");
        require(msg.sender==OWNER || role[msg.sender]==Role.ADMIN || role[msg.sender]==Role.MANAGER,"You are not authorized to remove roles");
        require(role[_address]!=Role.NONE,"The given address does not hold a role");
        require(_address!=OWNER,"You cannot remove the role of the owner");
        role[_address]=Role.NONE;
        emit RoleAssigned(_address,role[_address],msg.sender,block.timestamp);
    }

    function getRole(address _address) public view returns(Role) {
        return role[_address];
    }

    function grantPermission(address _address,Permission _permission) external {
        require(_address!=address(0),"Enter a valid address");
        require(msg.sender==OWNER || role[msg.sender]==Role.ADMIN || role[msg.sender]==Role.MANAGER,"You are not authorized to grant permissions");
        require(_permission!=Permission.NONE,"Enter a valid permission");
        require(role[_address]!=Role.NONE,"The given address does not hold a role");
        permissions[_address][_permission]=true;
        emit PermissionGranted(_address,role[_address],_permission,msg.sender,block.timestamp);
    }

    function revokePermission(address _address,Permission _permission) external {
        require(_address!=address(0),"Enter a valid address");
        require(msg.sender==OWNER || role[msg.sender]==Role.ADMIN || role[msg.sender]==Role.MANAGER,"You are not authorized to revoke permissions");
        require(_permission!=Permission.NONE,"Enter a valid permission");

        permissions[_address][_permission]=false;
        emit PermissionRevoked(_address,role[_address],_permission,msg.sender,block.timestamp);
    }

    function hasRole(address _address) public view returns(string memory,Role) {
        require(role[_address]!=Role.NONE,"The given address does not hold a role");
        return ("The given address hold a role which is ", role[_address]);
    }

    function hasPermission(address _address,Permission _permission) public view returns(bool) {
        return permissions[_address][_permission];
    }

}
