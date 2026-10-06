using Xamarin.Forms;

namespace TidewaterDriver.Samples
{
    // A scratch page for trying controls. examples/config.json leaves the folder Samples out, so none of this is reported.
    public class PlaygroundPage : ContentPage
    {
        public PlaygroundPage()
        {
            Content = new RelativeLayout();
            MessagingCenter.Subscribe<PlaygroundPage>(this, "Ping", _ => { });
        }
    }
}
