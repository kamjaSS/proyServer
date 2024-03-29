const bcrypt = require("bcrypt-nodejs");
const User = require("../models/user");
const jwt = require("../services/jwt");

const signUp = (req, res) => {
  const user = new User();
  const { name_user, lastname, email, password, repeatPassword } = req.body;
  user.name_user = name_user;
  user.lastname = lastname;
  user.email = email.toLowerCase();
  /* Por default almacenamos el rol y si es un usuario activo o no */
  user.role = "admin";
  user.active = true;
  /* Si no existe una de las dos password */
  if (!password || !repeatPassword) {
    res.status(404).send({ message: "Las contraseñas son obligatorias" });
  } else {
    if (password !== repeatPassword) {
      res.status(404).send({ message: "Las contraseñas no coinciden" });
    } else {
      bcrypt.hash(password, null, null, (err, hash) => {
        /* No funciono la encriptación */
        if (err) {
          res
            .status(500)
            .send({ message: "Error al encriptar la contraseña." });
        } else {
          user.password = hash;
          user.save((err, userStored) => {
            if (err) {
              res.status(500).send({ message: "El usuario ya existe." });
            } else {
              if (!userStored) {
                res.status(404).send({ message: "Error al crear el usuario." });
              } else {
                res.status(200).send({ user: userStored });
              }
            }
          });
        }
      });
    }
  }
};

const signIn = (req, res) => {
  console.log("Login correcto");
  const params = req.body;
  const email = params.email.toLowerCase();
  const password = params.password;
  User.findOne({ email }, (err, userStored) => {
    if (err) {
      res.status(500).send({ message: "Error del servidor." });
    } else {
      if (!userStored) {
        res.status(404).send({ message: "Usuario no encontrado." });
      } else {
        bcrypt.compare(password, userStored.password, (err, check) => {
          if (err) {
            res.status(500).send({ message: "Error del servidor." });
          } else if (!check) {
            res.status(404).send({ message: "La contraseña es incorrecta." });
          } else {
            if (!userStored.active) {
              res
                .status(200)
                .send({ code: 200, message: "El usuario no se ha activado." });
            } else {
              res.status(200).send({
                accessToken: jwt.createAccessWithToken(userStored),
                refreshToken: jwt.createRefreshToken(userStored),
              });
            }
          }
        });
      }
    }
  });
};

const getUsers = (req, res) => {
  User.find().then((users) => {
    !users
      ? res.status(404).send({ message: "No se ha encontrado ningún usuario" })
      : res.status(200).send({ users });
  });
};

const getActiveUsers = (req, res) => {
  const activeUsers = req.query;
  User.find({ active: activeUsers.active }).then((users) => {
    !users
      ? res.status(404).send({ message: "No se ha encontrado ningún usuario" })
      : res.status(200).send({ users });
  });
};

const activateUser = (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  User.findByIdAndUpdate(id, { active }, (err, userStored) => {
    err
      ? res.status(500).send({ message: "Error del servidor." })
      : !userStored
      ? res.status(404).send({ message: "No se ha encontrado el usuario." })
      : active === true
      ? res.status(200).send({ message: "Usuario activado correctamente." })
      : res.status(200).send({ message: "Usuario desactivado correctamente." });
  });
};

function uploadAvatar(req, res) {
  const params = req.params;
  User.findById({ _id: params.id }, (err, userData) => {
    if (err) {
      res.status(500).send({ message: "Error del servidor." });
    } else {
      if (!userData) {
        res.status(404).send({ message: "Nose ha encontrado ningun usuario." });
      } else {
        let user = userData;

        if (req.files) {
          let filePath = req.files.avatar.path;
          let fileSplit = filePath.split("/");
          let fileName = fileSplit[2];
          let extSplit = fileName.split(".");
          let fileExt = extSplit[1];

          if (fileExt !== "png" && fileExt !== "jpg") {
            res.status(400).send({
              message:
                "La extension de la imagen no es valida. (Extensiones permitidas: .png y .jpg)",
            });
          } else {
            user.avatar = fileName;
            User.findByIdAndUpdate(
              { _id: params.id },
              user,
              (err, userResult) => {
                if (err) {
                  res.status(500).send({ message: "Error del servidor." });
                } else {
                  if (!userResult) {
                    res
                      .status(404)
                      .send({ message: "No se ha encontrado ningun usuario." });
                  } else {
                    res.status(200).send({ avatarName: fileName });
                  }
                }
              }
            );
          }
        }
      }
    }
  });
}

function getAvatar(req, res) {
  const avatarName = req.params.avatarName;
  const filePath = "./assets/avatar" + avatarName;

  fs.exists(filePath, (exists) => {
    if (!exists) {
      res.status(404).send({ message: "El avatar que buscas no existe." });
    } else {
      res.sendFile(path.resolve(filePath));
    }
  });
}

async function updateUser(req, res) {
  let userData = req.body;
  userData.email = req.body.email.toLowerCase();
  const params = req.params;
  console.log(params, userData);
  if (userData.password) {
    await bcrypt.hash(userData.password, null, null, (err, hash) => {
      if (err) {
        res.status(500).send({ message: "Error al encriptar la contraseña." });
      } else {
        userData.password = hash;
      }
    });
  }
  /* Actualizamos el resto de los datos */
  User.findByIdAndUpdate({ _id: params.id }, userData, (err, userUpdate) => {
    err
      ? res.status(500).send({ message: "Error del servidor." })
      : !userUpdate
      ? res.status(404).send({ message: "No se encontro el usuario." })
      : res.status(200).send({ message: "Usuario actualizado correctamente." });
  });
}

const deleteUser = (req, res) => {
  const { id } = req.params;

  User.findByIdAndRemove(id, (err, userDeleted) => {
    err
      ? res.status(500).send({ message: "Error del servidor." })
      : !userDeleted
      ? res.status(404).send({ message: "Usuario no encontrado." })
      : res
          .status(200)
          .send({ message: "El usuario ha sido eliminado correctamente." });
  });
};

function signUpAdmin(req, res) {
  const user = new User();

  const { name_user, lastname, email, role, password } = req.body;
  user.name_user = name_user;
  user.lastname = lastname;
  user.email = email.toLowerCase();
  user.role = role;
  user.active = true;

  !password
    ? res.status(500).send({ message: "La contraseña es obligatoria. " })
    : bcrypt.hash(password, null, null, (err, hash) => {
        err
          ? res
              .status(500)
              .send({ message: "Error al encriptar la contraseña." })
          : (user.password = hash);

        user.save((err, userStored) => {
          err
            ? res.status(500).send({ message: "El usuario ya existe." })
            : !userStored
            ? res
                .status(500)
                .send({ message: "Error al crear el nuevo usuario." })
            : res
                .status(200)
                .send({ message: "Usuario creado correctamente." });
        });
      });
}

module.exports = {
  signUp,
  signIn,
  getUsers,
  getActiveUsers,
  getAvatar,
  uploadAvatar,
  updateUser,
  activateUser,
  deleteUser,
  signUpAdmin,
};
