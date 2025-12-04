const groupService = require("../services/groups.service");

exports.createGroup = async (request, response) => {
    try {
        const result = await groupService.createGroup(request.body);
        response.status(201).json(result);
    }
    catch (error) {
        response.status(500).json({ error: "Failed to create group" });
    }
};

exports.getGroup = async (request, response) => {
    try {
        const result = await groupService.getGroup(request.params.groupCode);
        response.status(200).json(result);
    }
    catch {
        response.status(404).json({ error: "Group not found" });
    }
};

exports.listGroups = async (request, response) => {
    const groups = await groupService.listGroups();
    response.status(200).json(groups);
};
