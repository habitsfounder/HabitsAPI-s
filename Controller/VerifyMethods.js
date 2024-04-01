const VerificationMethod = require("../Model/VerificationMethod");

exports.createVerificationMethod = async (req, res, next) => {
  try {
    const newVerificationMethod = await VerificationMethod.create(req.body);
    res.status(201).json({ success: true, data: newVerificationMethod });
  } catch (error) {
    next(error);
  }
};

exports.getAllVerificationMethod = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const searchQuery = {};
  if (req.query.search) {
    searchQuery.method = { $regex: req.query.search, $options: "i" };
  }

  try {
    const totalHabits = await VerificationMethod.countDocuments(searchQuery);

    const totalPages = Math.ceil(totalHabits / limit);

    const Verification = await VerificationMethod.find(searchQuery)
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: Verification.length,
      page,
      totalPages,
      data: Verification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error occurred while retrieving Verification Methods.",
      error: error.message,
    });
  }
};

exports.getVerificationMethodById = async (req, res, next) => {
    try {
      const habit = await VerificationMethod.findById(req.params.id);
  
      if (!habit) {
        return res.status(404).json({ success: false, message: "Verification Method not found" });
      }
  
      res.status(200).json({ success: true, data: habit });
    } catch (error) {
      next(error);
    }
};