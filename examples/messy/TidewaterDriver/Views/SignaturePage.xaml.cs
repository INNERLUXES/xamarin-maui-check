using System;
using Xamarin.Forms;

namespace TidewaterDriver.Views
{
    public partial class SignaturePage : ContentPage
    {
        public SignaturePage()
        {
            InitializeComponent();
        }

        async void OnSaveClicked(object sender, EventArgs e)
        {
            MessagingCenter.Send(this, "SignatureSaved");
            await Navigation.PopAsync();
        }
    }
}
