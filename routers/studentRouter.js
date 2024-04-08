const router = require("express").Router()
const { registerUser, signIn, createImage, getStudentImage, acknowledgeImage } = require("../controllers/studentsController")
const { authenticate } = require("../middlewares/authentication")
const upload = require("../utils/multer")

router.post("/signUp", registerUser)
router.post("/signIn",signIn)
router.post("/upload-image", upload.single("profileImage"),authenticate ,createImage)
router.get("/get-image/:ID",getStudentImage)
router.delete("/delete-image/:ID",acknowledgeImage)

module.exports = router
