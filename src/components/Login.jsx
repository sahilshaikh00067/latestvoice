import { Formik } from "formik";
import { useState } from "react";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";
import { BASE } from "../components/api";

function Login() {

  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  const validationSchema = Yup.object({
    username: Yup.string()
      .min(3, "Username too short")
      .required("Username is required"),

    password: Yup.string()
      .min(3, "Min 3 characters")
      .required("Password is required"),
  });

  return (

    <div className="min-h-screen flex flex-col items-center justify-center bg-[#ececec] px-4">

      {/* LOGIN BOX */}
      <div className="w-full max-w-[530px] bg-[#EA7A9A] rounded-md px-8 pt-[35px] pb-[50px] shadow-lg">

        {/* LOGO */}
        <h1 className="text-center text-white text-[32px] font-bold mb-4 uppercase">
          VOICECHANNEL.CO.IN
        </h1>

        {/* TITLE */}
        <h2 className="text-center text-white text-[24px] mb-6">
          Sign In Your Account
        </h2>

        <Formik
          initialValues={{ username: "", password: "" }}
          validationSchema={validationSchema}

          onSubmit={async (values, { setSubmitting }) => {

            try {

              const res = await fetch(`${BASE}/login/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
              });

              const data = await res.json();

              console.log("LOGIN RESPONSE:", data);

              if (data.status === "success") {

                sessionStorage.clear();

                sessionStorage.setItem("user_id", data.user_id);

                sessionStorage.setItem(
                  "user",
                  JSON.stringify({
                    id: data.user_id,
                    username: values.username,
                    role: data.role,
                    credit: data.credit,
                  })
                );

                sessionStorage.setItem("role", data.role);

                setMessage("Login successful ✅");

                setTimeout(() => {
                  navigate("/dashboard");
                }, 500);

              } else {

                setMessage("Invalid username or password ❌");

              }

            } catch (err) {

              console.log(err);
              setMessage("Server error ❌");

            }

            setSubmitting(false);

          }}
        >

          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting,
          }) => (

            <form onSubmit={handleSubmit}>

              {/* USERNAME */}
              <div className="mb-5">

                <label className="block text-white text-[20px] font-semibold mb-2">
                  Username
                </label>

                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.username}
                  className="customInput"
                />

                <p className="errorText">
                  {errors.username &&
                    touched.username &&
                    errors.username}
                </p>

              </div>

              {/* PASSWORD */}
              <div className="mb-4">

                <label className="block text-white text-[20px] font-semibold mb-2">
                  Password
                </label>

                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.password}
                  className="customInput"
                />

                <p className="errorText">
                  {errors.password &&
                    touched.password &&
                    errors.password}
                </p>

              </div>

              {/* FORGOT */}
              <div className="flex justify-end mb-6">
                <p className="text-white text-[16px] cursor-pointer hover:underline">
                  Forgot Password?
                </p>
              </div>

              {/* MESSAGE */}
              <p className="text-white text-sm text-center mb-4">
                {message}
              </p>

              {/* BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="loginBtn"
              >
                Sign Me In
              </button>

              {/* CREATE */}
              <div className="mt-5 text-center">
                <p className="text-white text-[16px]">
                  Don't have an account?{" "}
                  <span className="font-medium cursor-pointer hover:underline">
                    Create an account
                  </span>
                </p>
              </div>

            </form>

          )}

        </Formik>

      </div>

      {/* FOOTER */}
      <div className="mt-5">
        <p className="text-[#2f3e7d] text-[18px] font-semibold">
          Mobile Number : | | Email Id:
        </p>
      </div>

      {/* CSS */}
      <style>{`

        .customInput{
          width:100%;
          height:52px;
          border:none;
          outline:none;
          background:#efefef;
          border-radius:12px;
          padding:0 16px;
          font-size:16px;
          color:#444;
        }

        .customInput::placeholder{
          color:#777;
        }

        .customInput:focus{
          box-shadow:0 0 0 2px rgba(255,255,255,0.4);
        }

        .loginBtn{
          width:100%;
          height:56px;
          background:#f5f5f5;
          border:none;
          border-radius:16px;
          color:#df7398;
          font-size:22px;
          font-weight:700;
          cursor:pointer;
          transition:0.3s;
        }

        .loginBtn:hover{
          background:white;
        }

        .errorText{
          color:#fff;
          font-size:12px;
          margin-top:5px;
        }

      `}</style>

    </div>

  );
}

export default Login;