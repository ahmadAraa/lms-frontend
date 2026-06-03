{
  "openapi": "3.1.1",
  "info": {
    "title": "LMS | v1",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:5232/"
    }
  ],
  "paths": {
    "/api/Course/CreateCourses": {
      "post": {
        "tags": [
          "Course"
        ],
        "requestBody": {
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "type": "object",
                "properties": {
                  "Title": {
                    "type": "string"
                  },
                  "Description": {
                    "maxLength": 500,
                    "type": "string"
                  },
                  "LearningPathId": {
                    "pattern": "^-?(?:0|[1-9]\\d*)$",
                    "type": [
                      "integer",
                      "string"
                    ],
                    "format": "int32"
                  },
                  "Image": {
                    "$ref": "#/components/schemas/IFormFile"
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Course/UpdateCourse/{id}": {
      "put": {
        "tags": [
          "Course"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "type": "object",
                "properties": {
                  "Title": {
                    "type": "string"
                  },
                  "Description": {
                    "maxLength": 500,
                    "type": "string"
                  },
                  "LearningPathId": {
                    "pattern": "^-?(?:0|[1-9]\\d*)$",
                    "type": [
                      "integer",
                      "string"
                    ],
                    "format": "int32"
                  },
                  "Image": {
                    "$ref": "#/components/schemas/IFormFile"
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Course/DeleteCourse/{id}": {
      "delete": {
        "tags": [
          "Course"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Course/GetMyCourses": {
      "get": {
        "tags": [
          "Course"
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Course/GetCoursesByPath/{learningPathId}": {
      "get": {
        "tags": [
          "Course"
        ],
        "parameters": [
          {
            "name": "learningPathId",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Course/{courseId}": {
      "get": {
        "tags": [
          "Course"
        ],
        "parameters": [
          {
            "name": "courseId",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Course/reorder": {
      "post": {
        "tags": [
          "Course"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/ReorderCourseDto"
                }
              }
            },
            "text/json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/ReorderCourseDto"
                }
              }
            },
            "application/*+json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/ReorderCourseDto"
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Device/register": {
      "post": {
        "tags": [
          "Device"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "string"
              }
            },
            "text/json": {
              "schema": {
                "type": "string"
              }
            },
            "application/*+json": {
              "schema": {
                "type": "string"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Enrollment/EnrollUser": {
      "post": {
        "tags": [
          "Enrollment"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/EnrollDto"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/EnrollDto"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/EnrollDto"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Enrollment/GetEmployeeWithManagerId/{managerId}": {
      "get": {
        "tags": [
          "Enrollment"
        ],
        "parameters": [
          {
            "name": "managerId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Enrollment/GetEmployeeProgressWithManagerId/{managerId}": {
      "get": {
        "tags": [
          "Enrollment"
        ],
        "parameters": [
          {
            "name": "managerId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Enrollment/GetEmployeeCoursesProgress/{employeeId}/{learningPathId}": {
      "get": {
        "tags": [
          "Enrollment"
        ],
        "parameters": [
          {
            "name": "employeeId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "learningPathId",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Enrollment/learningpath/{id}/employeescount": {
      "get": {
        "tags": [
          "Enrollment"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/LearningPath/AddPath": {
      "post": {
        "tags": [
          "LearningPath"
        ],
        "requestBody": {
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "type": "object",
                "properties": {
                  "Title": {
                    "type": "string"
                  },
                  "Image": {
                    "$ref": "#/components/schemas/IFormFile"
                  },
                  "Description": {
                    "type": "string"
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/LearningPath/GetPaths": {
      "get": {
        "tags": [
          "LearningPath"
        ],
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "text/plain": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/LearningPathResponseDto"
                  }
                }
              },
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/LearningPathResponseDto"
                  }
                }
              },
              "text/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/LearningPathResponseDto"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/LearningPath/GetMyPaths": {
      "get": {
        "tags": [
          "LearningPath"
        ],
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "text/plain": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/LearningPathResponseDto"
                  }
                }
              },
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/LearningPathResponseDto"
                  }
                }
              },
              "text/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/LearningPathResponseDto"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/LearningPath/GetPathById/{id}": {
      "get": {
        "tags": [
          "LearningPath"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "text/plain": {
                "schema": {
                  "$ref": "#/components/schemas/LearningPathResponseDto"
                }
              },
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LearningPathResponseDto"
                }
              },
              "text/json": {
                "schema": {
                  "$ref": "#/components/schemas/LearningPathResponseDto"
                }
              }
            }
          }
        }
      }
    },
    "/api/LearningPath/UpdatePath/{id}": {
      "put": {
        "tags": [
          "LearningPath"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "type": "object",
                "properties": {
                  "Title": {
                    "type": "string"
                  },
                  "Image": {
                    "$ref": "#/components/schemas/IFormFile"
                  },
                  "Description": {
                    "type": "string"
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/LearningPath/DeletePath/{id}": {
      "delete": {
        "tags": [
          "LearningPath"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/LearningPath/MyProgress/{learningPathId}": {
      "get": {
        "tags": [
          "LearningPath"
        ],
        "parameters": [
          {
            "name": "learningPathId",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/LearningPath/ContinueLearning/{learningPathId}": {
      "get": {
        "tags": [
          "LearningPath"
        ],
        "parameters": [
          {
            "name": "learningPathId",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Lessons/CreateLesson": {
      "post": {
        "tags": [
          "Lessons"
        ],
        "requestBody": {
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "type": "object",
                "properties": {
                  "Title": {
                    "maxLength": 100,
                    "type": "string"
                  },
                  "Description": {
                    "maxLength": 500,
                    "type": "string"
                  },
                  "Content": {
                    "type": "string"
                  },
                  "VideoUrl": {
                    "$ref": "#/components/schemas/IFormFile"
                  },
                  "MaterialType": {
                    "$ref": "#/components/schemas/MaterialType"
                  },
                  "LinkUrl": {
                    "type": "string"
                  },
                  "SectionId": {
                    "pattern": "^-?(?:0|[1-9]\\d*)$",
                    "type": [
                      "integer",
                      "string"
                    ],
                    "format": "int32"
                  },
                  "Order": {
                    "pattern": "^-?(?:0|[1-9]\\d*)$",
                    "type": [
                      "integer",
                      "string"
                    ],
                    "format": "int32"
                  }
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Lessons/{id}": {
      "put": {
        "tags": [
          "Lessons"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateLessonDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateLessonDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateLessonDTO"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      },
      "delete": {
        "tags": [
          "Lessons"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Lessons/GetLessonsBySection/{sectionId}": {
      "get": {
        "tags": [
          "Lessons"
        ],
        "parameters": [
          {
            "name": "sectionId",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Lessons/GetLessonById/{id}": {
      "get": {
        "tags": [
          "Lessons"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Lessons/CompleteLesson/{lessonId}": {
      "post": {
        "tags": [
          "Lessons"
        ],
        "parameters": [
          {
            "name": "lessonId",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Lessons/reorder": {
      "post": {
        "tags": [
          "Lessons"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/ReorderLessonDto"
                }
              }
            },
            "text/json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/ReorderLessonDto"
                }
              }
            },
            "application/*+json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/ReorderLessonDto"
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Notification/my": {
      "get": {
        "tags": [
          "Notification"
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Notification/read/{id}": {
      "post": {
        "tags": [
          "Notification"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Notification/count": {
      "get": {
        "tags": [
          "Notification"
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Notification/read-all": {
      "post": {
        "tags": [
          "Notification"
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Password/SendToken": {
      "post": {
        "tags": [
          "Password"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SendTokenDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/SendTokenDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/SendTokenDTO"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Password/reset-password": {
      "post": {
        "tags": [
          "Password"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResetPasswordDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/ResetPasswordDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/ResetPasswordDTO"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Password/forgot-password": {
      "post": {
        "tags": [
          "Password"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ForgotPasswordDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/ForgotPasswordDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/ForgotPasswordDTO"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Password/ChangePassword": {
      "post": {
        "tags": [
          "Password"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ChangePasswordDto"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/ChangePasswordDto"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/ChangePasswordDto"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Progress/CanAccess/{courseId}": {
      "get": {
        "tags": [
          "Progress"
        ],
        "parameters": [
          {
            "name": "courseId",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Progress/{courseId}": {
      "get": {
        "tags": [
          "Progress"
        ],
        "parameters": [
          {
            "name": "courseId",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Sections/CreateSection": {
      "post": {
        "tags": [
          "Sections"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateSectionDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateSectionDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/CreateSectionDTO"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Sections/{id}": {
      "put": {
        "tags": [
          "Sections"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateSectionDTO"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateSectionDTO"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateSectionDTO"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      },
      "delete": {
        "tags": [
          "Sections"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Sections/GetSectionsByCourse/{courseId}": {
      "get": {
        "tags": [
          "Sections"
        ],
        "parameters": [
          {
            "name": "courseId",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Sections/GetSectionById/{id}": {
      "get": {
        "tags": [
          "Sections"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "pattern": "^-?(?:0|[1-9]\\d*)$",
              "type": [
                "integer",
                "string"
              ],
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/Sections/reorder": {
      "post": {
        "tags": [
          "Sections"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/ReorderSectionDto"
                }
              }
            },
            "text/json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/ReorderSectionDto"
                }
              }
            },
            "application/*+json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/ReorderSectionDto"
                }
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/User/Login": {
      "post": {
        "tags": [
          "User"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UserLoginDto"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/UserLoginDto"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/UserLoginDto"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/User/create-user": {
      "post": {
        "tags": [
          "User"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UserRegisterDto"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/UserRegisterDto"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/UserRegisterDto"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/User/SearchUsers": {
      "get": {
        "tags": [
          "User"
        ],
        "parameters": [
          {
            "name": "value",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/User/GetUserInfo/{id}": {
      "get": {
        "tags": [
          "User"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/User/DeleteUser/{id}": {
      "delete": {
        "tags": [
          "User"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    },
    "/api/User/UpdateUserName": {
      "put": {
        "tags": [
          "User"
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateUserNameDto"
              }
            },
            "text/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateUserNameDto"
              }
            },
            "application/*+json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateUserNameDto"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "OK"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "ChangePasswordDto": {
        "type": "object",
        "properties": {
          "currentPassword": {
            "type": "string"
          },
          "newPassword": {
            "type": "string"
          },
          "confirmPassword": {
            "type": "string"
          }
        }
      },
      "CourseResponseDTO": {
        "required": [
          "title"
        ],
        "type": "object",
        "properties": {
          "id": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "title": {
            "type": "string"
          },
          "description": {
            "type": [
              "null",
              "string"
            ]
          },
          "order": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "learningPathId": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "sections": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/SectionResponseDTO"
            }
          },
          "image": {
            "type": [
              "null",
              "string"
            ]
          }
        }
      },
      "CreateSectionDTO": {
        "required": [
          "title"
        ],
        "type": "object",
        "properties": {
          "title": {
            "maxLength": 100,
            "type": "string"
          },
          "description": {
            "maxLength": 500,
            "type": [
              "null",
              "string"
            ]
          },
          "courseId": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          }
        }
      },
      "EnrollDto": {
        "type": "object",
        "properties": {
          "userId": {
            "type": "string"
          },
          "managerId": {
            "type": "string"
          },
          "courseId": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "null",
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "learningPathId": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "null",
              "integer",
              "string"
            ],
            "format": "int32"
          }
        }
      },
      "ForgotPasswordDTO": {
        "required": [
          "email"
        ],
        "type": "object",
        "properties": {
          "email": {
            "type": "string"
          }
        }
      },
      "IFormFile": {
        "type": "string",
        "format": "binary"
      },
      "LearningPathResponseDto": {
        "required": [
          "title"
        ],
        "type": "object",
        "properties": {
          "id": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "title": {
            "type": "string"
          },
          "description": {
            "type": [
              "null",
              "string"
            ]
          },
          "image": {
            "type": [
              "null",
              "string"
            ]
          },
          "courses": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/CourseResponseDTO"
            }
          }
        }
      },
      "LessonResponseDTO": {
        "type": "object",
        "properties": {
          "id": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "title": {
            "type": "string"
          },
          "description": {
            "type": [
              "null",
              "string"
            ]
          },
          "content": {
            "type": [
              "null",
              "string"
            ]
          },
          "videoUrl": {
            "type": [
              "null",
              "string"
            ]
          },
          "order": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "sectionId": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "type": {
            "$ref": "#/components/schemas/MaterialType"
          },
          "isComplete": {
            "type": "boolean"
          }
        }
      },
      "MaterialType": {
        "type": "integer"
      },
      "ReorderCourseDto": {
        "type": "object",
        "properties": {
          "id": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "order": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          }
        }
      },
      "ReorderLessonDto": {
        "type": "object",
        "properties": {
          "id": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "order": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          }
        }
      },
      "ReorderSectionDto": {
        "type": "object",
        "properties": {
          "id": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "order": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          }
        }
      },
      "ResetPasswordDTO": {
        "required": [
          "email",
          "token",
          "newPassword"
        ],
        "type": "object",
        "properties": {
          "email": {
            "type": "string"
          },
          "token": {
            "type": "string"
          },
          "newPassword": {
            "type": "string"
          }
        }
      },
      "SectionResponseDTO": {
        "type": "object",
        "properties": {
          "id": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "title": {
            "type": "string"
          },
          "description": {
            "type": [
              "null",
              "string"
            ]
          },
          "order": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "courseId": {
            "pattern": "^-?(?:0|[1-9]\\d*)$",
            "type": [
              "integer",
              "string"
            ],
            "format": "int32"
          },
          "lessons": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/LessonResponseDTO"
            }
          }
        }
      },
      "SendTokenDTO": {
        "required": [
          "email"
        ],
        "type": "object",
        "properties": {
          "email": {
            "type": "string"
          }
        }
      },
      "UpdateLessonDTO": {
        "required": [
          "title"
        ],
        "type": "object",
        "properties": {
          "title": {
            "maxLength": 100,
            "type": "string"
          },
          "description": {
            "maxLength": 500,
            "type": [
              "null",
              "string"
            ]
          },
          "content": {
            "type": [
              "null",
              "string"
            ]
          }
        }
      },
      "UpdateSectionDTO": {
        "required": [
          "title"
        ],
        "type": "object",
        "properties": {
          "title": {
            "maxLength": 100,
            "type": "string"
          },
          "description": {
            "maxLength": 500,
            "type": [
              "null",
              "string"
            ]
          }
        }
      },
      "UpdateUserNameDto": {
        "required": [
          "newUserName"
        ],
        "type": "object",
        "properties": {
          "newUserName": {
            "maxLength": 20,
            "minLength": 3,
            "pattern": "^[a-zA-Z0-9._]+$",
            "type": "string"
          }
        }
      },
      "UserLoginDto": {
        "required": [
          "email",
          "password"
        ],
        "type": "object",
        "properties": {
          "email": {
            "type": "string"
          },
          "password": {
            "type": "string"
          }
        }
      },
      "UserRegisterDto": {
        "required": [
          "userName",
          "email",
          "password",
          "confirmPassword"
        ],
        "type": "object",
        "properties": {
          "userName": {
            "type": "string"
          },
          "email": {
            "type": "string"
          },
          "password": {
            "type": "string"
          },
          "confirmPassword": {
            "type": "string"
          },
          "fullName": {
            "type": "string"
          },
          "role": {
            "type": "string"
          }
        }
      }
    }
  },
  "tags": [
    {
      "name": "Course"
    },
    {
      "name": "Device"
    },
    {
      "name": "Enrollment"
    },
    {
      "name": "LearningPath"
    },
    {
      "name": "Lessons"
    },
    {
      "name": "Notification"
    },
    {
      "name": "Password"
    },
    {
      "name": "Progress"
    },
    {
      "name": "Sections"
    },
    {
      "name": "User"
    }
  ]
}